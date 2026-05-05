import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import { SonicWaveformHero } from '@/components/ui/sonic-waveform';
import { CinematicHero } from '@/components/ui/cinematic-landing-hero';
import { AnimatedNav } from '@/components/ui/navigation-menu';
import { FluentFooter } from '@/components/ui/fluent-footer';
import { FaqSection } from '@/components/ui/faq-section';
import FeaturesSection from '@/components/ui/features-section';
import { HowItWorks } from '@/components/ui/how-it-works';
import { supabase } from '@/lib/supabase';

async function saveBetaSignup(email: string) {
  await supabase.from('beta_signups').insert({ email });
}

export default function HomePage() {
  const [showThankYou, setShowThankYou] = useState(false);

  const handleBetaSubmit = async (email: string) => {
    await saveBetaSignup(email);
    setShowThankYou(true);
  };

  return (
    <div className="bg-white text-slate-900 overflow-x-hidden">
      <AnimatedNav />

      <main>
        {/* Hero */}
        <section id="hero">
          <SonicWaveformHero onSubmit={handleBetaSubmit} />
        </section>

        {/* How it works */}
        <HowItWorks />

        {/* Feature cards */}
        <FeaturesSection />

        {/* Cinematic scroll section */}
        <CinematicHero onEmailSubmit={handleBetaSubmit} />

        <FaqSection />
      </main>

      <FluentFooter />

      {/* Thank you modal */}
      <AnimatePresence>
        {showThankYou && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowThankYou(false)}
            />
            <motion.div
              className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center"
              initial={{ scale: 0.85, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: 20, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
            >
              <button
                onClick={() => setShowThankYou(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-teal-600" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                You're on the waitlist!
              </h2>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                We'll reach out when your spot is ready. Early members lock in the lowest pricing tier — forever.
              </p>

              <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mb-6 text-left">
                <p className="text-sm font-semibold text-teal-800 mb-1">
                  Know someone who'd love this?
                </p>
                <p className="text-xs text-teal-700 leading-relaxed">
                  We'd really appreciate it if you shared Aloud with anyone you think would benefit — whether they struggle with phone calls, have a speech condition, or just want to call without speaking.
                </p>
              </div>

              <button
                onClick={() => setShowThankYou(false)}
                className="text-sm text-slate-400 hover:text-slate-700 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
