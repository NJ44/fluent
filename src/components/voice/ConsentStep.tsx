import { useState, useRef, useEffect } from 'react';

interface ConsentStepProps {
  userName: string;
  consentText: string;
  onComplete: (passphraseBlob: Blob) => void;
  onBack: () => void;
}

export default function ConsentStep({ userName: _userName, consentText, onComplete, onBack }: ConsentStepProps) {
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  async function startRecording() {
    setError(null);
    setBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
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

    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      const passphraseBlob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(passphraseBlob);
      setBlob(passphraseBlob);
      setAudioUrl(url);
    };

    recorder.start(100);
    setRecording(true);
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }

  function resetRecording() {
    setBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setError(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Step 2: Consent Recording</h2>
        <p className="mt-1 text-sm text-gray-500">
          Read the sentence below aloud exactly as written to confirm your consent.
        </p>
      </div>

      {/* Consent passphrase */}
      <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-5">
        <p className="text-sm font-medium text-blue-600 mb-2">Read this sentence aloud exactly as written:</p>
        <p className="text-lg font-medium text-blue-900 leading-relaxed">{consentText}</p>
      </div>

      {/* Recording controls */}
      <div className="flex flex-col items-center gap-4">
        {!recording && !blob && (
          <button
            onClick={startRecording}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <span className="h-3 w-3 rounded-full bg-white opacity-80" />
            Record Consent
          </button>
        )}

        {recording && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-red-600">
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
              <span className="font-medium">Recording…</span>
            </div>
            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-base font-medium text-white shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Stop Recording
            </button>
          </div>
        )}

        {error && (
          <div className="w-full rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {blob && audioUrl && (
          <div className="w-full space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 text-sm font-medium text-gray-700">Listen back to confirm:</p>
              <audio src={audioUrl} controls className="w-full" />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => onComplete(blob)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Use This Recording
              </button>
              <button
                onClick={resetRecording}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Re-record
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Back */}
      <div className="border-t border-gray-100 pt-4">
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          &larr; Back to voice recording
        </button>
      </div>
    </div>
  );
}
