import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import RecordingStep from '../components/voice/RecordingStep';
import ConsentStep from '../components/voice/ConsentStep';

type OnboardingStep = 'record' | 'consent' | 'clone' | 'playback' | 'done';

interface OnboardingState {
  step: OnboardingStep;
  mainBlob: Blob | null;
  passphraseBlob: Blob | null;
  consentText: string;
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

export default function VoiceOnboarding() {
  const { user } = useAuth();

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
                    <span className={`mt-1 text-xs ${active ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
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

          {state.step === 'clone' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <svg className="h-10 w-10 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900">Cloning your voice…</h2>
              <p className="text-sm text-gray-500 text-center">
                This step will be implemented in Plan 05. Your audio blobs are ready.
              </p>
            </div>
          )}

          {state.step === 'playback' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <h2 className="text-xl font-semibold text-gray-900">Preview</h2>
              <p className="text-sm text-gray-500">Voice clone preview — coming in Plan 05.</p>
            </div>
          )}

          {state.step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Voice clone complete!</h2>
              <p className="text-sm text-gray-500">You&apos;re all set. Redirecting to dashboard…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
