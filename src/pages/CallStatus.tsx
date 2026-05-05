// src/pages/CallStatus.tsx
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

const STATUS_COLORS: Record<CallStatusType, string> = {
  draft: 'text-gray-500',
  initiating: 'text-blue-500',
  ringing: 'text-blue-600',
  active: 'text-green-600',
  ended: 'text-gray-700',
  analyzed: 'text-green-700',
  failed: 'text-red-600',
};

const TERMINAL_STATUSES: CallStatusType[] = ['ended', 'analyzed', 'failed'];

export default function CallStatus() {
  const { id: callId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Poll for status until terminal state (Phase 3 will replace with Realtime subscription)
  useEffect(() => {
    if (!callId) return;

    let intervalId: ReturnType<typeof setInterval>;

    const fetchCall = async () => {
      const { data, error: fetchError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (fetchError) {
        setError('Could not load call status.');
        setLoading(false);
        return;
      }

      setCall(data as Call);
      setLoading(false);

      // Stop polling once terminal
      if (TERMINAL_STATUSES.includes((data as Call).status)) {
        clearInterval(intervalId);
      }
    };

    fetchCall();
    intervalId = setInterval(fetchCall, 2000); // Poll every 2s

    return () => clearInterval(intervalId);
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
          <button onClick={() => navigate('/dashboard')} className="mt-4 text-blue-600 hover:underline text-sm">
            ← Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const isFailed = call.status === 'failed';
  const isComplete = call.status === 'analyzed' || call.status === 'ended';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Status card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Status indicator */}
          <div className="flex items-center gap-3 mb-6">
            {!TERMINAL_STATUSES.includes(call.status) && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            )}
            <span className={`text-lg font-semibold ${STATUS_COLORS[call.status]}`}>
              {STATUS_LABELS[call.status]}
            </span>
          </div>

          {/* Intent */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Call goal</p>
            <p className="text-gray-800 text-sm">{call.intent}</p>
          </div>

          {/* Recipient */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Calling</p>
            <p className="text-gray-800 text-sm font-mono">{call.to_number}</p>
          </div>

          {/* Failure message — CALL-07 */}
          {isFailed && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-red-700 text-sm font-medium">Call could not be completed</p>
              <p className="text-red-600 text-sm mt-1">
                {getDisconnectionMessage(call.disconnection_reason)}
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="mt-3 text-sm text-red-600 font-medium hover:underline"
              >
                Try again →
              </button>
            </div>
          )}

          {/* Outcome summary — POST-01 */}
          {isComplete && call.outcome_summary && (
            <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-xs text-green-700 uppercase tracking-wide font-medium mb-1">Outcome</p>
              <p className="text-green-800 text-sm">{call.outcome_summary}</p>
            </div>
          )}

          {/* Duration */}
          {call.duration_ms && (
            <p className="mt-4 text-xs text-gray-400">
              Duration: {Math.round(call.duration_ms / 1000)}s
            </p>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            {isComplete && (
              <button
                onClick={() => navigate(`/calls/${callId}`)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                View full transcript
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              {isFailed ? 'Try again' : 'New call'}
            </button>
          </div>
        </div>

        {/* Status timeline (CALL-05) */}
        <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Status timeline</p>
          {(['initiating', 'ringing', 'active', 'ended', 'analyzed'] as CallStatusType[]).map((s) => {
            const statuses: CallStatusType[] = ['initiating', 'ringing', 'active', 'ended', 'analyzed', 'failed'];
            const currentIdx = statuses.indexOf(call.status);
            const stepIdx = statuses.indexOf(s);
            const isActive = call.status === s;
            const isPast = stepIdx < currentIdx;
            return (
              <div key={s} className={`flex items-center gap-2 py-1 text-xs ${
                isActive ? 'text-blue-600 font-medium' : isPast ? 'text-gray-400' : 'text-gray-300'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isActive ? 'bg-blue-600' : isPast ? 'bg-gray-400' : 'bg-gray-200'
                }`} />
                {STATUS_LABELS[s]}
              </div>
            );
          })}
          {call.status === 'failed' && (
            <div className="flex items-center gap-2 py-1 text-xs text-red-500 font-medium">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              Failed
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
