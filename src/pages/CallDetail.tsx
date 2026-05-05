// src/pages/CallDetail.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Call, CallStatus as CallStatusType } from '../types/calls';
import { getDisconnectionMessage } from '../types/calls';

const STATUS_LABELS: Record<CallStatusType, string> = {
  draft: 'Preparing...',
  initiating: 'Initiating call...',
  ringing: 'Ringing...',
  active: 'Call in progress',
  ended: 'Call completed',
  analyzed: 'Summary ready',
  failed: 'Call failed',
};

const TERMINAL_STATUSES: CallStatusType[] = ['ended', 'analyzed', 'failed'];

function formatDuration(ms: number | null): string {
  if (!ms) return '—';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Render transcript as alternating turns (AI vs Recipient)
function TranscriptView({ transcript, isCallActive }: { transcript: string; isCallActive?: boolean }) {
  const lines = transcript.split('\n').filter(l => l.trim().length > 0);
  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const isAI = line.toLowerCase().startsWith('ai:') || line.toLowerCase().startsWith('agent:');
        const text = line.replace(/^(AI|Agent|User|Human|Caller|Recipient):\s*/i, '').trim();
        const isLastLine = i === lines.length - 1;
        const isInProgress = isCallActive && isLastLine && isAI && !/[.?!]$/.test(text);
        return (
          <div key={i} className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-xs lg:max-w-md rounded-xl px-4 py-2 text-sm ${
              isAI
                ? 'bg-blue-50 text-blue-900 rounded-tl-none'
                : 'bg-gray-100 text-gray-800 rounded-tr-none'
            }`}>
              <span className={`text-xs font-medium block mb-0.5 ${isAI ? 'text-blue-500' : 'text-gray-400'}`}>
                {isAI ? 'AI' : 'Recipient'}
              </span>
              {text}
              {isInProgress && (
                <span className="inline-block w-1.5 h-3.5 bg-blue-400 animate-pulse ml-0.5 rounded-sm align-middle" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CallDetail() {
  const { id: callId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBarging, setIsBarging] = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);
  const [bargeError, setBargeError] = useState('');

  const handleBargeIn = async () => {
    if (!callId) return;
    setBargeError('');
    setIsBarging(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch('/api/barge-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ callId, action: 'barge_in' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Barge-in failed');
      // isBarging stays true — user is now live
    } catch (err) {
      setBargeError(err instanceof Error ? err.message : 'Barge-in failed');
      setIsBarging(false);
    }
  };

  const handleEndCall = async () => {
    if (!callId) return;
    setIsEndingCall(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      await fetch('/api/barge-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ callId, action: 'end_call' }),
      });
    } catch { /* ignore */ } finally {
      setIsEndingCall(false);
    }
  };

  useEffect(() => {
    if (!callId) return;

    // Initial load
    const fetchCall = async () => {
      const { data, error: err } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (err || !data) {
        setError('Call not found or access denied.');
        setLoading(false);
        return;
      }

      setCall(data as Call);
      setLoading(false);
    };

    fetchCall();

    // Realtime subscription — sub-second updates
    const channel = supabase
      .channel(`call-${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${callId}`,
        },
        (payload) => {
          setCall(payload.new as Call);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'Call not found.'}</p>
          <button onClick={() => navigate('/history')} className="mt-4 text-blue-600 hover:underline text-sm">
            ← Back to history
          </button>
        </div>
      </div>
    );
  }

  const isFailed = call.status === 'failed';
  const isTerminal = TERMINAL_STATUSES.includes(call.status);
  const isActive = !isTerminal;
  const isComplete = call.status === 'analyzed' || call.status === 'ended';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Back nav */}
        <button
          onClick={() => navigate('/history')}
          className="mb-6 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← Call history
        </button>

        {/* Call metadata card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {isActive && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 flex-shrink-0" />
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Call goal</p>
                <p className="text-gray-900 font-medium">{call.intent}</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                isFailed ? 'bg-red-100 text-red-700' :
                call.status === 'analyzed' ? 'bg-green-100 text-green-700' :
                isActive ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {STATUS_LABELS[call.status]}
              </span>
              {call.status === 'active' && (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50 border border-red-200 text-xs font-medium text-red-600 flex-shrink-0 ml-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-1">Called</p>
              <p className="font-mono text-gray-700">{call.to_number}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Duration</p>
              <p className="text-gray-700">{formatDuration(call.duration_ms)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Date</p>
              <p className="text-gray-700">{formatDate(call.created_at)}</p>
            </div>
          </div>
        </div>

        {/* In-progress status timeline */}
        {isActive && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Status timeline</p>
            {(['initiating', 'ringing', 'active', 'ended', 'analyzed'] as CallStatusType[]).map((s) => {
              const statuses: CallStatusType[] = ['initiating', 'ringing', 'active', 'ended', 'analyzed', 'failed'];
              const currentIdx = statuses.indexOf(call.status);
              const stepIdx = statuses.indexOf(s);
              const isCurrentStep = call.status === s;
              const isPast = stepIdx < currentIdx;
              return (
                <div key={s} className={`flex items-center gap-2 py-1 text-xs ${
                  isCurrentStep ? 'text-blue-600 font-medium' : isPast ? 'text-gray-400' : 'text-gray-300'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isCurrentStep ? 'bg-blue-600' : isPast ? 'bg-gray-400' : 'bg-gray-200'
                  }`} />
                  {STATUS_LABELS[s]}
                </div>
              );
            })}
          </div>
        )}

        {/* Failure message — CALL-07 */}
        {isFailed && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-medium text-red-700 mb-1">Call could not be completed</p>
            <p className="text-sm text-red-600">{getDisconnectionMessage(call.disconnection_reason)}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-3 text-sm font-medium text-red-600 hover:underline"
            >
              Try again →
            </button>
          </div>
        )}

        {/* Outcome summary — POST-01 */}
        {!isFailed && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Outcome summary</p>
            {call.outcome_summary ? (
              <p className="text-gray-900 text-sm leading-relaxed">{call.outcome_summary}</p>
            ) : isActive ? (
              <p className="text-gray-400 text-sm italic">Call in progress — summary available after the call ends.</p>
            ) : isComplete ? (
              <p className="text-gray-400 text-sm italic">Summary not yet ready. Check back in a moment.</p>
            ) : (
              <p className="text-gray-400 text-sm italic">No summary available.</p>
            )}
          </div>
        )}

        {/* Full transcript — POST-02 */}
        {call.transcript && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Full transcript</p>
            <TranscriptView transcript={call.transcript} isCallActive={call.status === 'active'} />
          </div>
        )}

        {!call.transcript && isTerminal && !isFailed && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-gray-400 text-sm">No transcript available for this call.</p>
          </div>
        )}

        {/* Barge-in controls — shown during active calls */}
        {call.status === 'active' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Call controls</p>
            <div className="flex gap-3">
              <button
                onClick={handleBargeIn}
                disabled={isBarging}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isBarging ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    You're live
                  </>
                ) : (
                  '🎤 Barge In'
                )}
              </button>
              <button
                onClick={handleEndCall}
                disabled={isEndingCall}
                className="rounded-lg border border-red-200 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {isEndingCall ? 'Ending...' : 'End Call'}
              </button>
            </div>
            {bargeError && (
              <p className="mt-2 text-xs text-red-600">{bargeError}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {isFailed ? 'Try again' : 'New call'}
          </button>
          <button
            onClick={() => navigate('/history')}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Call history
          </button>
        </div>
      </div>
    </div>
  );
}
