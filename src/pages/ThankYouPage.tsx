import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ThankYouPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      {/* Brand */}
      <div className="flex items-center gap-2 mb-12">
        <img src="/Aloud_logo.png" className="w-7 h-7 object-contain" alt="Aloud" />
        <span className="font-black text-slate-900 text-lg tracking-tight">Aloud</span>
      </div>

      {/* Check icon */}
      <div className="w-20 h-20 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mb-8">
        <CheckCircle2 className="w-10 h-10 text-teal-600" />
      </div>

      {/* Heading */}
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
        You're on the list.
      </h1>
      <p className="text-slate-500 text-lg max-w-md mx-auto mb-10 leading-relaxed">
        We'll reach out when your beta spot is ready. Early members lock in the lowest pricing tier — forever.
      </p>

      {/* What's next */}
      <div className="flex flex-col gap-3 max-w-xs w-full mb-12">
        {[
          "We review applications weekly",
          "You'll get an email with next steps",
          "Your voice model slot is reserved",
        ].map((step) => (
          <div key={step} className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
            {step}
          </div>
        ))}
      </div>

      {/* Back link */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Aloud
      </button>
    </div>
  );
}
