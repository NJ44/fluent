import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface CloneStepProps {
  mainBlob: Blob;
  passphraseBlob: Blob;
  isReclone?: boolean;
  onComplete: (previewAudioUrl: string, retellVoiceId: string) => void;
  onError: (message: string) => void;
}

export default function CloneStep({
  mainBlob,
  passphraseBlob,
  isReclone = false,
  onComplete,
  onError,
}: CloneStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  async function submitClone() {
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        const msg = 'Session expired — please sign in again.';
        setError(msg);
        onError(msg);
        return;
      }

      const formData = new FormData();
      formData.append('mainAudio', mainBlob, 'voice-sample.webm');
      formData.append('passphraseAudio', passphraseBlob, 'consent.webm');
      formData.append('action', isReclone ? 'reclone' : 'new');

      const res = await fetch('/api/clone-voice', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        // Do NOT set Content-Type manually — fetch sets it with boundary
      });

      if (!res.ok) {
        let errorMsg = 'Voice cloning failed. Please try again.';
        try {
          const errData = (await res.json()) as { error?: string };
          if (errData.error) errorMsg = errData.error;
        } catch {
          // ignore JSON parse error
        }
        setError(errorMsg);
        onError(errorMsg);
        return;
      }

      const data = (await res.json()) as {
        voice_id: string;
        preview_audio_url: string | null;
      };

      onComplete(data.preview_audio_url || '', data.voice_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error occurred.';
      setError(msg);
      onError(msg);
    }
  }

  useEffect(() => {
    submitClone();
    // Run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRetry() {
    setRetrying(true);
    submitClone().finally(() => setRetrying(false));
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Cloning failed</h2>
        <p className="text-sm text-red-600 text-center max-w-sm">{error}</p>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <svg
        className="h-10 w-10 animate-spin text-blue-600"
        fill="none"
        viewBox="0 0 24 24"
        aria-label="Loading"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <h2 className="text-xl font-semibold text-gray-900">Cloning your voice…</h2>
      <p className="text-sm text-gray-500 text-center">
        This takes about 30 seconds. Please keep this tab open.
      </p>
    </div>
  );
}
