interface PlaybackStepProps {
  previewAudioUrl: string;
  onConfirm: () => void;
  onRestart: () => void;
}

export default function PlaybackStep({
  previewAudioUrl,
  onConfirm,
  onRestart,
}: PlaybackStepProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <h2 className="text-xl font-semibold text-gray-900">Does this sound like you?</h2>
      <p className="text-sm text-gray-500 text-center max-w-sm">
        Listen to a preview of your cloned voice below.
      </p>

      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-gray-50 p-4">
        {previewAudioUrl ? (
          <audio
            controls
            autoPlay
            src={previewAudioUrl}
            className="w-full"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
              />
            </svg>
            <p className="text-sm text-gray-400">Preview not available</p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center max-w-sm">
        Your cloned voice will only be used by you — it&apos;s never shared.
      </p>

      <div className="flex gap-3 w-full max-w-sm">
        <button
          onClick={onRestart}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          No, re-record
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Yes, that&apos;s me
        </button>
      </div>
    </div>
  );
}
