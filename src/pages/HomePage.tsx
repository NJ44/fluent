import { useNavigate } from 'react-router-dom';
import { SonicWaveformHero } from '@/components/ui/sonic-waveform';
import { CinematicHero } from '@/components/ui/cinematic-landing-hero';
import { AnimatedNav } from '@/components/ui/navigation-menu';
import { FluentFooter } from '@/components/ui/fluent-footer';
import { FaqSection } from '@/components/ui/faq-section';
import FeaturesSection from '@/components/ui/features-section';

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

        <FaqSection />
      </main>

      <FluentFooter />
    </div>
  );
}
