import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { RippleWaveLoader } from '../ui/ripple-wave-loader';

interface RetellVoice {
  voice_id: string;
  voice_name: string;
  preview_audio_url?: string;
  gender?: string;
  accent?: string;
}

interface AIVoiceStepProps {
  onComplete: () => void;
  onBack: () => void;
  isReclone?: boolean;
}

export default function AIVoiceStep({ onComplete, onBack, isReclone = false }: AIVoiceStepProps) {
  const [voices, setVoices] = useState<RetellVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function fetchVoices() {
      setLoading(true);
      setFetchError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token ?? '';
        const res = await fetch('/api/list-voices', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`Failed to load voices (${res.status})`);
        }
        const json = await res.json();
        // Accept either { voices: [...] } or a plain array
        const list: RetellVoice[] = Array.isArray(json) ? json : (json.voices ?? []);
        setVoices(list);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Failed to load voices');
      } finally {
        setLoading(false);
      }
    }
    fetchVoices();
  }, []);

  function handlePreview(voice: RetellVoice) {
    if (!voice.preview_audio_url) return;

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingId === voice.voice_id) {
      setPlayingId(null);
      return;
    }

    const audio = new Audio(voice.preview_audio_url);
    audioRef.current = audio;
    setPlayingId(voice.voice_id);
    audio.play().catch(() => setPlayingId(null));
    audio.onended = () => setPlayingId(null);
  }

  async function handleUseVoice() {
    if (!selectedVoiceId) return;
    setSaving(true);
    setSaveError(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        throw new Error('Not authenticated');
      }
      const userId = sessionData.session.user.id;

      if (isReclone) {
        const { error: updateError } = await supabase
          .from('voice_clones')
          .update({ status: 'superseded', superseded_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('status', 'active');
        if (updateError) throw new Error(updateError.message);
      }

      const { error: insertError } = await supabase.from('voice_clones').insert({
        user_id: userId,
        retell_voice_id: selectedVoiceId,
        voice_type: 'ai',
        status: 'active',
        sample_url: '',
      });
      if (insertError) throw new Error(insertError.message);

      onComplete();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="mb-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            &larr; Back
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Choose an AI Voice</h1>
          <p className="mt-1 text-sm text-gray-500">
            Select a voice from our library — you can preview each one before choosing.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <RippleWaveLoader />
          </div>
        )}

        {/* Fetch error */}
        {!loading && fetchError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {fetchError}
          </div>
        )}

        {/* Voice grid */}
        {!loading && !fetchError && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {voices.map((voice) => {
                const isSelected = selectedVoiceId === voice.voice_id;
                return (
                  <button
                    key={voice.voice_id}
                    onClick={() => setSelectedVoiceId(voice.voice_id)}
                    className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{voice.voice_name}</p>
                      {(voice.gender || voice.accent) && (
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {[voice.gender, voice.accent].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>

                    {voice.preview_audio_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(voice);
                        }}
                        className="ml-3 flex-shrink-0 rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        aria-label={`Preview ${voice.voice_name}`}
                      >
                        {playingId === voice.voice_id ? (
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                            Stop
                          </span>
                        ) : (
                          'Preview'
                        )}
                      </button>
                    )}
                  </button>
                );
              })}
            </div>

            {voices.length === 0 && (
              <p className="py-12 text-center text-sm text-gray-400">No voices available.</p>
            )}

            {/* Save error */}
            {saveError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {saveError}
              </div>
            )}

            {/* Action */}
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleUseVoice}
                disabled={!selectedVoiceId || saving}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {saving ? 'Saving…' : 'Use this voice'}
              </button>
              <button
                onClick={onBack}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                &larr; Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
