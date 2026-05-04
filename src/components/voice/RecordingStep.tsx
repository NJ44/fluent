import { useState, useRef, useEffect } from 'react';
import { analyzeAudioQuality } from '../../lib/audio-quality';
import type { QualityResult } from '../../lib/audio-quality';

export const SCRIPTED_PASSAGE = `The sun was rising over the hills when I walked outside. A fresh wind moved through the trees and the air felt clear and light. I had a long day ahead of me — meetings, phone calls, and some time to think. I was looking forward to the afternoon, when the noise would slow down and I could finally sit still.

Across the street, a neighbor was walking their dog along the narrow path that runs beside the river. The water was moving fast this morning, silver and bright under the early light. It is a scene I have seen many times, but it always feels worth noticing.

I thought about the conversations I would have that day. There were things I needed to explain, ideas I wanted to share, and a few tricky situations I had been preparing for. It felt useful to go over the words in my head, to make sure I knew what I meant before I said it out loud.`;

interface RecordingStepProps {
  userName: string;
  onComplete: (mainBlob: Blob) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const MAX_DURATION_SECONDS = 120;

export default function RecordingStep({ userName: _userName, onComplete }: RecordingStepProps) {
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [quality, setQuality] = useState<QualityResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  async function startRecording() {
    setError(null);
    setBlob(null);
    setQuality(null);
    setDuration(0);
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch {
      setError('Microphone access was denied. Please allow microphone access and try again.');
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      const audioBlob = new Blob(chunksRef.current, { type: mimeType });
      setBlob(audioBlob);
      setAnalyzing(true);

      try {
        const result = await analyzeAudioQuality(audioBlob);
        setQuality(result);
      } catch {
        setError('Could not analyze audio quality. Please try recording again.');
      } finally {
        setAnalyzing(false);
      }
    };

    recorder.start(100);
    setRecording(true);

    timerRef.current = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);

    autoStopRef.current = setTimeout(() => {
      stopRecording();
    }, MAX_DURATION_SECONDS * 1000);
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }

  function resetRecording() {
    setBlob(null);
    setQuality(null);
    setError(null);
    setDuration(0);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Step 1: Record Your Voice Sample</h2>
        <p className="mt-1 text-sm text-gray-500">
          Read this passage aloud at a natural, comfortable pace. Don&apos;t rush.
        </p>
      </div>

      {/* Scripted passage */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 max-h-56 overflow-y-auto">
        <p className="text-base leading-relaxed text-gray-800 whitespace-pre-line">
          {SCRIPTED_PASSAGE}
        </p>
      </div>

      {/* Recording controls */}
      <div className="flex flex-col items-center gap-4">
        {!recording && !blob && (
          <button
            onClick={startRecording}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <span className="h-3 w-3 rounded-full bg-white opacity-80" />
            Start Recording
          </button>
        )}

        {recording && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-red-600">
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
              <span className="font-mono text-lg font-semibold">{formatDuration(duration)}</span>
              <span className="text-sm text-gray-500">/ {formatDuration(MAX_DURATION_SECONDS)}</span>
            </div>
            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-base font-medium text-white shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Stop Recording
            </button>
            <p className="text-xs text-gray-400">Recording stops automatically at 2 minutes</p>
          </div>
        )}

        {analyzing && (
          <div className="flex items-center gap-2 text-gray-500">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Analyzing audio quality…
          </div>
        )}

        {error && !recording && (
          <div className="w-full rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button
              onClick={resetRecording}
              className="mt-2 block font-medium underline hover:no-underline"
            >
              Try Again
            </button>
          </div>
        )}

        {quality && !analyzing && (
          <div className={`w-full rounded-lg border p-4 ${
            quality.passed && !quality.reason
              ? 'border-green-200 bg-green-50'
              : quality.passed && quality.reason
              ? 'border-yellow-200 bg-yellow-50'
              : 'border-red-200 bg-red-50'
          }`}>
            {quality.passed && !quality.reason && (
              <div className="flex items-center gap-2 text-green-700">
                <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Quality: Good</span>
              </div>
            )}
            {quality.passed && quality.reason && (
              <div className="text-yellow-700">
                <div className="flex items-center gap-2 font-medium">
                  <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
                  </svg>
                  Warning
                </div>
                <p className="mt-1 text-sm">{quality.reason}</p>
              </div>
            )}
            {!quality.passed && (
              <div className="text-red-700">
                <div className="flex items-center gap-2 font-medium">
                  <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Recording Failed
                </div>
                <p className="mt-1 text-sm">{quality.reason}</p>
              </div>
            )}

            <div className="mt-3 flex gap-3">
              {quality.passed && (
                <button
                  onClick={() => blob && onComplete(blob)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  {quality.reason ? 'Continue Anyway' : 'Continue'}
                </button>
              )}
              {(quality.reason || !quality.passed) && (
                <button
                  onClick={resetRecording}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {quality.passed ? 'Re-record' : 'Try Again'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer copy */}
      <p className="text-center text-xs text-gray-400">
        Record what&apos;s comfortable. We&apos;ll handle the fluency.
      </p>
    </div>
  );
}
