import { AnimatedNav } from "@/components/ui/navigation-menu";
import { FluentFooter } from "@/components/ui/fluent-footer";
import AboutPage from "@/components/ui/about-page";

export default function AboutPageRoute() {
  return (
    <div className="bg-white text-slate-900 overflow-x-hidden">
      <AnimatedNav />
      <main className="pt-16">
        <AboutPage />
      </main>
      <FluentFooter />
    </div>
  );
}
