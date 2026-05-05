interface VoiceTypeStepProps {
  onSelectOwn: () => void;
  onSelectAI: () => void;
}

export default function VoiceTypeStep({ onSelectOwn, onSelectAI }: VoiceTypeStepProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Choose your voice</h1>
          <p className="mt-2 text-sm text-gray-500">
            Aloud will speak on your behalf — pick how you'd like to sound.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* My Own Voice */}
          <button
            onClick={onSelectOwn}
            className="group flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-left transition-all hover:border-blue-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
              <svg
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 text-center">My Own Voice</h2>
              <p className="mt-1 text-sm text-gray-500 text-center">
                We'll clone your voice with 60 seconds of recording
              </p>
            </div>
          </button>

          {/* AI Voice */}
          <button
            onClick={onSelectAI}
            className="group flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-left transition-all hover:border-blue-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
              <svg
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 text-center">AI Voice</h2>
              <p className="mt-1 text-sm text-gray-500 text-center">
                Choose from a library of natural-sounding voices
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
