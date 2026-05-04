import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import VoiceOnboarding from './VoiceOnboarding';

interface CloneStatus {
  id: string;
  created_at: string;
  retell_voice_id: string;
}

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [clone, setClone] = useState<CloneStatus | null>(null);
  const [loadingClone, setLoadingClone] = useState(true);
  const [showRecloneModal, setShowRecloneModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingClone, setDeletingClone] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchClone = useCallback(async () => {
    setLoadingClone(true);
    try {
      const { data, error } = await supabase
        .from('voice_clones')
        .select('id, created_at, retell_voice_id')
        .eq('status', 'active')
        .limit(1);

      if (error) {
        console.error('[Settings] fetch clone error:', error);
        setClone(null);
      } else {
        setClone((data && data.length > 0) ? (data[0] as CloneStatus) : null);
      }
    } finally {
      setLoadingClone(false);
    }
  }, []);

  useEffect(() => {
    void fetchClone();
  }, [fetchClone]);

  async function handleDeleteClone() {
    if (!clone) return;
    setDeletingClone(true);
    setDeleteError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setDeleteError('Session expired — please sign in again.');
        return;
      }

      const res = await fetch('/api/delete-voice', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clone_id: clone.id }),
      });

      if (!res.ok) {
        let errorMsg = 'Failed to delete voice clone.';
        try {
          const errData = (await res.json()) as { error?: string };
          if (errData.error) errorMsg = errData.error;
        } catch {
          // ignore
        }
        setDeleteError(errorMsg);
        return;
      }

      // Success — redirect to onboarding
      navigate('/onboarding');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error.';
      setDeleteError(msg);
    } finally {
      setDeletingClone(false);
    }
  }

  function handleRecloneComplete() {
    setShowRecloneModal(false);
    void fetchClone();
  }

  async function handleSignOut() {
    await logout();
    navigate('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* Voice Clone Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Voice Clone</h2>

          {loadingClone ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="h-4 w-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading…
            </div>
          ) : clone ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Clone active
                </span>
                <span className="text-sm text-gray-500">
                  Created {new Date(clone.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRecloneModal(true)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Re-record my voice
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                >
                  Delete my voice
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">No voice clone yet.</p>
              <button
                onClick={() => navigate('/onboarding')}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Create my voice
              </button>
            </div>
          )}
        </div>

        {/* Account Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
          <div className="space-y-3">
            <div>
              <span className="block text-xs text-gray-400 uppercase tracking-wide">Name</span>
              <span className="text-sm text-gray-900">{user?.name || '—'}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-400 uppercase tracking-wide">Email</span>
              <span className="text-sm text-gray-900">{user?.email || '—'}</span>
            </div>
            <div className="pt-2">
              <button
                onClick={handleSignOut}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete your voice clone?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure? This permanently deletes your cloned voice. Your call history is not affected.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError(null);
                }}
                disabled={deletingClone}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClone}
                disabled={deletingClone}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deletingClone ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-clone modal */}
      {showRecloneModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div className="min-h-screen flex items-start justify-center py-8 px-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl relative">
              <button
                onClick={() => setShowRecloneModal(false)}
                className="absolute top-4 right-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <VoiceOnboarding
                isReclone={true}
                onRecloneComplete={handleRecloneComplete}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
