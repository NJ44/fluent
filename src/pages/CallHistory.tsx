// src/pages/CallHistory.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Call, CallStatus } from '../types/calls';
import { getDisconnectionMessage } from '../types/calls';
import { RippleWaveLoader } from '../components/ui/ripple-wave-loader';

const STATUS_BADGE_COLORS: Record<CallStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  initiating: 'bg-blue-100 text-blue-600',
  ringing: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  ended: 'bg-gray-100 text-gray-700',
  analyzed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-700',
};

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CallHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('calls')
      .select('*')
      .eq('user_id', user.id) // Explicit user_id for index hit (calls_user_created_idx)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError('Failed to load call history.');
        else setCalls((data as Call[]) || []);
        setLoading(false);
      });
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RippleWaveLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Call history</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            New call
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        {calls.length === 0 && !error && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-2">No calls yet</p>
            <p className="text-gray-400 text-sm">Place your first call from the dashboard.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 text-blue-600 hover:underline text-sm"
            >
              Go to dashboard →
            </button>
          </div>
        )}

        {calls.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
            {calls.map(call => {
              const isFailed = call.status === 'failed';
              const summaryText = call.outcome_summary
                || (isFailed ? getDisconnectionMessage(call.disconnection_reason) : null)
                || (call.status === 'analyzed' || call.status === 'ended' ? 'Summary not ready' : '...');

              return (
                <div
                  key={call.id}
                  data-call-id={call.id}
                  onClick={() => navigate(`/calls/${call.id}`)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  {/* Status badge */}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_BADGE_COLORS[call.status]}`}>
                    {call.status}
                  </span>

                  {/* Intent + summary */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{call.intent}</p>
                    <p className={`text-xs mt-0.5 truncate ${isFailed ? 'text-red-500' : 'text-gray-400'}`}>
                      {summaryText}
                    </p>
                  </div>

                  {/* Date */}
                  <p className="text-xs text-gray-400 flex-shrink-0">{formatRelativeDate(call.created_at)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
