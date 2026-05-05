import { useNavigate } from 'react-router-dom';
import { SonicWaveformHero } from '@/components/ui/sonic-waveform';
import { CinematicHero } from '@/components/ui/cinematic-landing-hero';
import { AnimatedNav } from '@/components/ui/navigation-menu';
import { FluentFooter } from '@/components/ui/fluent-footer';
import { FaqSection } from '@/components/ui/faq-section';
import FeaturesSection from '@/components/ui/features-section';
import { ArrowRight } from 'lucide-react';

const STEPS = [
  { n: "01", title: "Record", desc: "Open Fluent and read a short passage. 30 seconds is all we need." },
  { n: "02", title: "Clone", desc: "Our AI analyzes your voice patterns and builds a high-fidelity voice model." },
  { n: "03", title: "Speak", desc: "Type anything — Fluent speaks it back in your exact voice, instantly." },
];

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="bg-white text-slate-900 overflow-x-hidden">
      <AnimatedNav />

      <main>
        {/* Hero */}
        <section id="hero">
          <SonicWaveformHero />
        </section>

        {/* Feature cards (below hero) */}
        <FeaturesSection />

        {/* Cinematic scroll section */}
        <CinematicHero onEmailSubmit={(email) => { console.log('Beta signup:', email); navigate('/thank-you'); }} />

        {/* How it works */}
        <section id="how-it-works" className="py-28 px-6 bg-white relative overflow-hidden">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-teal-100/30 blur-3xl pointer-events-none" />
          <div className="relative max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs tracking-widest uppercase text-teal-600 font-semibold">How it works</span>
              <h3 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-slate-900">Three steps.</h3>
            </div>
            <div className="flex flex-col md:flex-row gap-8">
              {STEPS.map((s, i) => (
                <div key={s.n} className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-5xl font-black text-slate-900/10">{s.n}</span>
                    {i < STEPS.length - 1 && (
                      <ArrowRight className="hidden md:block w-5 h-5 text-teal-400 ml-auto" />
                    )}
                  </div>
                  <h4 className="text-2xl font-bold text-slate-900 mb-2">{s.title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <FaqSection />
      </main>

      <FluentFooter />
    </div>
  );
}
