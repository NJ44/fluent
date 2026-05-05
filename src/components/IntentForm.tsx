// src/components/IntentForm.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { CallIntent } from '../types/calls';

// E.164: + country-code + number, 8-15 digits total
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

interface IntentFormProps {
  onSubmit: (result: { callId: string; retellCallId: string }) => void;
  isLoading?: boolean;
}

export function IntentForm({ onSubmit, isLoading = false }: IntentFormProps) {
  const { user } = useAuth();
  const [hasClone, setHasClone] = useState<boolean | null>(null); // null = checking

  // Form state
  const [callType, setCallType] = useState<'outbound' | 'inbound'>('outbound');
  const [intent, setIntent] = useState('');
  const [toNumber, setToNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientContext, setRecipientContext] = useState('');
  const [numberError, setNumberError] = useState('');
  const [fallbackRules, setFallbackRules] = useState<string[]>(['']);
  const [consentAttested, setConsentAttested] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Analysis state
  const [analysisState, setAnalysisState] = useState<'idle' | 'analyzing' | 'questions' | 'confirmed'>('idle');
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<string[]>([]);

  // Check for active clone on mount (INTENT-04)
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('voice_clones')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data }) => setHasClone(!!data));
  }, [user?.id]);

  // Reset analysis state when callType changes
  useEffect(() => {
    setAnalysisState('idle');
    setClarificationQuestions([]);
    setClarificationAnswers([]);
  }, [callType]);

  // E.164 validation on blur
  const handleNumberBlur = () => {
    if (toNumber && !E164_REGEX.test(toNumber)) {
      setNumberError('Please use international format: +1 (country code) + number. Example: +12125551234');
    } else {
      setNumberError('');
    }
  };

  // Fallback rules management (INTENT-03: max 3)
  const addFallbackRule = () => {
    if (fallbackRules.length < 3) setFallbackRules([...fallbackRules, '']);
  };
  const updateFallbackRule = (index: number, value: string) => {
    const updated = [...fallbackRules];
    updated[index] = value;
    setFallbackRules(updated);
  };
  const removeFallbackRule = (index: number) => {
    setFallbackRules(fallbackRules.filter((_, i) => i !== index));
  };

  const isFormValid =
    hasClone === true &&
    intent.trim().length >= 10 &&
    (callType === 'inbound' || E164_REGEX.test(toNumber)) &&
    consentAttested &&
    !isSubmitting &&
    !isLoading;

  const handleActualCall = async (overrideContext?: string) => {
    setIsSubmitting(true);
    setSubmitError('');

    const payload: CallIntent = {
      toNumber: callType === 'outbound' ? toNumber : '',
      intent: intent.trim(),
      fallbackRules: fallbackRules.filter(r => r.trim().length > 0),
      consentAttested: true,
      callType,
      recipientName: recipientName.trim() || undefined,
      recipientContext: (overrideContext ?? recipientContext.trim()) || undefined,
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch('/api/initiate-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Call failed (${res.status})`);
      }

      onSubmit({ callId: data.callId, retellCallId: data.retellCallId });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to place call. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    // Stage 2: user has answered clarification questions — place the call
    if (analysisState === 'questions') {
      const enrichedContext = [
        recipientContext,
        ...clarificationQuestions
          .map((q, i) => `${q}: ${clarificationAnswers[i]}`)
          .filter((_, i) => clarificationAnswers[i].trim()),
      ].filter(Boolean).join('\n');
      await handleActualCall(enrichedContext);
      return;
    }

    // Stage 1: analysisState === 'idle' — run pre-call analysis
    setAnalysisState('analyzing');
    setSubmitError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch('/api/analyze-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          intent,
          recipientName,
          recipientContext,
          callType,
          fallbackRules: fallbackRules.filter(r => r.trim().length > 0),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || `Analysis failed (${res.status})`);

      if (data.sufficient === true || !data.questions?.length) {
        setAnalysisState('confirmed');
        await handleActualCall();
      } else {
        setClarificationQuestions(data.questions);
        setClarificationAnswers(new Array(data.questions.length).fill(''));
        setAnalysisState('questions');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      setAnalysisState('idle');
    }
  };

  const submitButtonLabel = isSubmitting
    ? 'Placing call...'
    : analysisState === 'analyzing'
      ? 'Analyzing...'
      : analysisState === 'questions'
        ? 'Send call'
        : 'Continue →';

  const submitButtonDisabled =
    analysisState === 'analyzing'
      ? true
      : analysisState === 'questions'
        ? !isFormValid || !clarificationAnswers.every(a => a.trim().length > 0)
        : !isFormValid;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      {/* Call type toggle */}
      <div>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden mb-2">
          <button
            type="button"
            onClick={() => setCallType('outbound')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              callType === 'outbound' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Outbound call
          </button>
          <button
            type="button"
            onClick={() => setCallType('inbound')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              callType === 'inbound' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Receive inbound
          </button>
        </div>
        {callType === 'inbound' && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-blue-700 text-sm">
            Your AI assistant will answer incoming calls to your Fluent number and speak in your voice.
          </div>
        )}
      </div>

      {/* Clone status banner */}
      {hasClone === false && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm">
          No active voice clone. <a href="/onboarding" className="font-medium underline">Complete voice setup</a> before placing calls.
        </div>
      )}

      {/* Call goal — INTENT-01 */}
      <div>
        <label htmlFor="intent" className="block text-sm font-medium text-gray-700 mb-1">
          What should the AI say? (call goal)
        </label>
        <textarea
          id="intent"
          aria-label="call goal"
          rows={3}
          value={intent}
          onChange={e => setIntent(e.target.value)}
          placeholder="Book a table for 4 at Mario's restaurant for tonight at 7pm"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          required
          minLength={10}
        />
        <p className="mt-1 text-xs text-gray-500">{intent.trim().length}/10 characters minimum</p>
      </div>

      {/* Recipient name — only for outbound */}
      {callType === 'outbound' && (
        <div>
          <label htmlFor="recipientName" className="block text-sm font-medium text-gray-700 mb-1">
            Who are you calling? <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="recipientName"
            type="text"
            value={recipientName}
            onChange={e => setRecipientName(e.target.value)}
            placeholder="e.g. Mario's Restaurant, Dr. Smith's Office, IRS"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Context / details — only for outbound */}
      {callType === 'outbound' && (
        <div>
          <label htmlFor="recipientContext" className="block text-sm font-medium text-gray-700 mb-1">
            What should the AI know? <span className="text-gray-400 font-normal">(account numbers, details, context)</span>
          </label>
          <textarea
            id="recipientContext"
            rows={3}
            value={recipientContext}
            onChange={e => setRecipientContext(e.target.value)}
            placeholder="e.g. My account number is 12345. I want to dispute the charge from April 15th. If they need my birthday it's Jan 15 1990."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      )}

      {/* Recipient phone — INTENT-02 */}
      {callType === 'outbound' && (
      <div>
        <label htmlFor="toNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Recipient phone number
        </label>
        <input
          id="toNumber"
          type="tel"
          aria-label="phone number"
          value={toNumber}
          onChange={e => setToNumber(e.target.value)}
          onBlur={handleNumberBlur}
          placeholder="+12125551234"
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            numberError ? 'border-red-400' : 'border-gray-300'
          }`}
          required
        />
        {numberError && (
          <p className="mt-1 text-xs text-red-600">{numberError}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">Use E.164 format: +1 (country code) + number</p>
      </div>
      )}

      {/* Fallback rules — INTENT-03: up to 3 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fallback rules (optional, up to 3)
        </label>
        <div className="space-y-2">
          {fallbackRules.map((rule, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={rule}
                onChange={e => updateFallbackRule(i, e.target.value)}
                placeholder={`If the primary goal fails, ${i === 0 ? 'try an alternative time' : 'what should the AI do?'}`}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {fallbackRules.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFallbackRule(i)}
                  className="px-2 py-1 text-gray-400 hover:text-red-500 text-sm"
                  aria-label="Remove fallback rule"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {fallbackRules.length < 3 && (
          <button
            type="button"
            onClick={addFallbackRule}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            + Add fallback rule
          </button>
        )}
      </div>

      {/* Consent checkbox — TCPA compliance */}
      <div className="flex items-start gap-2">
        <input
          id="consent"
          type="checkbox"
          checked={consentAttested}
          onChange={e => setConsentAttested(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
          required
        />
        <label htmlFor="consent" className="text-sm text-gray-600">
          {callType === 'inbound'
            ? 'I understand my AI will answer and speak on my behalf.'
            : 'I confirm I have permission to contact this number. The call will open with an AI disclosure statement.'}
        </label>
      </div>

      {/* Clarification questions — shown when analysis needs more info */}
      {analysisState === 'questions' && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800">A couple of quick questions to help the AI:</p>
          {clarificationQuestions.map((q, i) => (
            <div key={i}>
              <p className="text-sm text-amber-700 mb-1">{q}</p>
              <input
                type="text"
                value={clarificationAnswers[i]}
                onChange={e => {
                  const updated = [...clarificationAnswers];
                  updated[i] = e.target.value;
                  setClarificationAnswers(updated);
                }}
                className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Your answer..."
              />
            </div>
          ))}
        </div>
      )}

      {/* Submit error */}
      {submitError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
          {submitError}
        </div>
      )}

      {/* Submit button — INTENT-04: disabled when no clone */}
      <button
        type="submit"
        disabled={submitButtonDisabled}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitButtonLabel}
      </button>
    </form>
  );
}

export default IntentForm;
