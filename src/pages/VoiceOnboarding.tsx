import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RecordingStep from '../components/voice/RecordingStep';
import ConsentStep from '../components/voice/ConsentStep';
import CloneStep from '../components/voice/CloneStep';
import PlaybackStep from '../components/voice/PlaybackStep';
import VoiceTypeStep from '../components/voice/VoiceTypeStep';
import AIVoiceStep from '../components/voice/AIVoiceStep';

type OnboardingStep = 'record' | 'consent' | 'clone' | 'playback' | 'done';

interface OnboardingState {
  step: OnboardingStep;
  mainBlob: Blob | null;
  passphraseBlob: Blob | null;
  consentText: string;
  previewUrl: string;
  retellVoiceId: string;
  cloneError: string | null;
}

const STEP_LABELS: { key: OnboardingStep; label: string }[] = [
  { key: 'record', label: 'Record' },
  { key: 'consent', label: 'Consent' },
  { key: 'clone', label: 'Clone' },
  { key: 'playback', label: 'Preview' },
];

const STEP_ORDER: OnboardingStep[] = ['record', 'consent', 'clone', 'playback', 'done'];

function stepIndex(step: OnboardingStep): number {
  return STEP_ORDER.indexOf(step);
}

interface VoiceOnboardingProps {
  isReclone?: boolean;
  onRecloneComplete?: () => void;
}

export default function VoiceOnboarding({
  isReclone = false,
  onRecloneComplete,
}: VoiceOnboardingProps = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [voiceTypeChosen, setVoiceTypeChosen] = useState<'own' | 'ai' | null>(null);

  const consentText = useMemo(() => {
    const name = user?.name || 'User';
    const date = new Date().toLocaleDateString();
    return `I, ${name}, on ${date}, consent to my voice being used by Fluent`;
  }, [user?.name]);

  const [state, setState] = useState<OnboardingState>({
    step: 'record',
    mainBlob: null,
    passphraseBlob: null,
    consentText,
    previewUrl: '',
    retellVoiceId: '',
    cloneError: null,
  });

  function handleRecordComplete(blob: Blob) {
    setState(s => ({ ...s, mainBlob: blob, step: 'consent' }));
  }

  function handleConsentComplete(blob: Blob) {
    setState(s => ({ ...s, passphraseBlob: blob, step: 'clone' }));
  }

  function handleBackToRecord() {
    setState(s => ({ ...s, step: 'record' }));
  }

  function handleCloneComplete(previewUrl: string, retellVoiceId: string) {
    setState(s => ({ ...s, previewUrl, retellVoiceId, step: 'playback', cloneError: null }));
  }

  function handleCloneError(message: string) {
    setState(s => ({ ...s, cloneError: message }));
  }

  function handlePlaybackConfirm() {
    if (isReclone && onRecloneComplete) {
      onRecloneComplete();
    } else {
      setState(s => ({ ...s, step: 'done' }));
    }
  }

  function handlePlaybackRestart() {
    setState(s => ({ ...s, step: 'record', mainBlob: null, passphraseBlob: null }));
  }

  function handleGoToDashboard() {
    navigate('/dashboard');
  }

  function handleAIComplete() {
    if (isReclone && onRecloneComplete) {
      onRecloneComplete();
    } else {
      navigate('/dashboard');
    }
  }

  // Step 0: voice type selection
  if (voiceTypeChosen === null) {
    return (
      <VoiceTypeStep
        onSelectOwn={() => setVoiceTypeChosen('own')}
        onSelectAI={() => setVoiceTypeChosen('ai')}
      />
    );
  }

  // AI voice picker flow
  if (voiceTypeChosen === 'ai') {
    return (
      <AIVoiceStep
        onComplete={handleAIComplete}
        onBack={() => setVoiceTypeChosen(null)}
        isReclone={isReclone}
      />
    );
  }

  // Own voice cloning flow (voiceTypeChosen === 'own')
  const userName = user?.name || '';
  const currentIndex = stepIndex(state.step);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Progress indicator */}
        <div className="mb-10">
          <div className="flex items-center justify-center gap-0">
            {STEP_LABELS.map((s, i) => {
              const done = currentIndex > i;
              const active = currentIndex === i;
              return (
                <div key={s.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        done
                          ? 'bg-blue-600 text-white'
                          : active
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {done ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={`mt-1 text-xs ${
                        active ? 'text-blue-600 font-medium' : 'text-gray-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div
                      className={`mb-5 h-px w-16 transition-colors ${
                        currentIndex > i ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {state.step === 'record' && (
            <RecordingStep userName={userName} onComplete={handleRecordComplete} />
          )}

          {state.step === 'consent' && (
            <ConsentStep
              userName={userName}
              consentText={state.consentText}
              onComplete={handleConsentComplete}
              onBack={handleBackToRecord}
            />
          )}

          {state.step === 'clone' && state.mainBlob && state.passphraseBlob && (
            <CloneStep
              mainBlob={state.mainBlob}
              passphraseBlob={state.passphraseBlob}
              isReclone={isReclone}
              onComplete={handleCloneComplete}
              onError={handleCloneError}
            />
          )}

          {state.step === 'playback' && (
            <PlaybackStep
              previewAudioUrl={state.previewUrl}
              onConfirm={handlePlaybackConfirm}
              onRestart={handlePlaybackRestart}
            />
          )}

          {state.step === 'done' && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  className="h-7 w-7 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Voice clone complete!</h2>
              <p className="text-sm text-gray-500 text-center">
                Your voice has been cloned and is ready to use.
              </p>
              <button
                onClick={handleGoToDashboard}
                className="rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
