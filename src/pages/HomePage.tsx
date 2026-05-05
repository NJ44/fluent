import { SonicWaveformHero } from '@/components/ui/sonic-waveform';
import { CinematicHero } from '@/components/ui/cinematic-landing-hero';
import { AnimatedNav } from '@/components/ui/navigation-menu';
import { FluentFooter } from '@/components/ui/fluent-footer';
import { FaqSection } from '@/components/ui/faq-section';
import { ProjectCard } from '@/components/ui/project-card';
import { ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    imgSrc: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&auto=format&fit=crop",
    title: "30-Second Sample",
    description: "Record just 30 seconds of your voice. Fluent's AI does the rest — no studio, no script.",
    link: "#hero",
    linkText: "Get Early Access",
  },
  {
    imgSrc: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&auto=format&fit=crop",
    title: "HD Voice Output",
    description: "Generate speech that sounds indistinguishable from you. Every breath, every nuance, captured.",
    link: "#hero",
    linkText: "Hear the Difference",
  },
  {
    imgSrc: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop",
    title: "Instant Generation",
    description: "Sub-second generation times mean your voice is ready the moment you need it.",
    link: "#hero",
    linkText: "See It in Action",
  },
  {
    imgSrc: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&auto=format&fit=crop",
    title: "Private & Secure",
    description: "Your voice model is yours alone. End-to-end encrypted, never shared, fully deletable.",
    link: "#hero",
    linkText: "Learn More",
  },
];

const STEPS = [
  { n: "01", title: "Record", desc: "Open Fluent and read a short passage. 30 seconds is all we need." },
  { n: "02", title: "Clone", desc: "Our AI analyzes your voice patterns and builds a high-fidelity voice model." },
  { n: "03", title: "Speak", desc: "Type anything — Fluent speaks it back in your exact voice, instantly." },
];

export default function HomePage() {
  return (
    <div className="bg-black text-white overflow-x-hidden">
      <AnimatedNav />

      <main>
        <section id="hero">
          <SonicWaveformHero />
        </section>

        <CinematicHero />

        <section id="features" className="py-28 px-6 bg-black relative">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-[#030810] to-black pointer-events-none" />
          <div className="relative max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs tracking-widest uppercase text-teal-400 font-semibold">Why Fluent</span>
              <h3 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
                Built differently,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
                  sounds perfect.
                </span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {FEATURES.map((f) => (
                <ProjectCard
                  key={f.title}
                  imgSrc={f.imgSrc}
                  title={f.title}
                  description={f.description}
                  link={f.link}
                  linkText={f.linkText}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-28 px-6 bg-black relative overflow-hidden">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-teal-500/5 blur-3xl pointer-events-none" />
          <div className="relative max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs tracking-widest uppercase text-teal-400 font-semibold">How it works</span>
              <h3 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">Three steps.</h3>
            </div>
            <div className="flex flex-col md:flex-row gap-8">
              {STEPS.map((s, i) => (
                <div key={s.n} className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-5xl font-black text-white/10">{s.n}</span>
                    {i < STEPS.length - 1 && (
                      <ArrowRight className="hidden md:block w-5 h-5 text-teal-500/40 ml-auto" />
                    )}
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-2">{s.title}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
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
