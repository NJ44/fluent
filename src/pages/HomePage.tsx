import { useNavigate } from 'react-router-dom';
import { SonicWaveformHero } from '@/components/ui/sonic-waveform';
import { CinematicHero } from '@/components/ui/cinematic-landing-hero';
import { AnimatedNav } from '@/components/ui/navigation-menu';
import { FluentFooter } from '@/components/ui/fluent-footer';
import { FaqSection } from '@/components/ui/faq-section';
import FeaturesSection from '@/components/ui/features-section';
import { supabase } from '@/lib/supabase';

async function saveBetaSignup(email: string) {
  await supabase.from('beta_signups').insert({ email });
}

export default function HomePage() {
  const navigate = useNavigate();

  const handleBetaSubmit = async (email: string) => {
    await saveBetaSignup(email);
    navigate('/thank-you');
  };

  return (
    <div className="bg-white text-slate-900 overflow-x-hidden">
      <AnimatedNav />

      <main>
        {/* Hero */}
        <section id="hero">
          <SonicWaveformHero onSubmit={handleBetaSubmit} />
        </section>

        {/* Feature cards (below hero) */}
        <FeaturesSection />

        {/* Cinematic scroll section */}
        <CinematicHero onEmailSubmit={handleBetaSubmit} />

        <FaqSection />
      </main>

      <FluentFooter />
    </div>
  );
}
