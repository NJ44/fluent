import type { MouseEvent } from "react";
import { DitheringShader } from "@/components/ui/dithering-shader";
import { Mic } from "lucide-react";

const LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How it Works", href: "#how-it-works" },
    { label: "Join Beta", href: "#hero" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
  ],
};

function handleLink(e: MouseEvent<HTMLAnchorElement>, href: string) {
  if (href.startsWith("#") && href.length > 1) {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) target.scrollIntoView({ behavior: "smooth" });
  }
}

export function FluentFooter() {
  return (
    <footer className="relative bg-black overflow-hidden border-t border-white/[0.04]">
      {/* Full-bleed wave shader */}
      <div className="absolute inset-0">
        <DitheringShader
          shape="wave"
          type="8x8"
          colorBack="#000810"
          colorFront="#00c896"
          pxSize={3}
          speed={0.45}
          width={1600}
          height={500}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Dark gradient so text stays readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        {/* Brand lockup */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="flex items-center gap-2 mb-3">
            <Mic className="w-6 h-6 text-teal-400" />
            <span className="text-white font-black text-2xl tracking-tight">Fluent</span>
          </div>
          <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
            Your voice, cloned perfectly. The fastest way to create natural AI voice.
          </p>
        </div>

        {/* Nav links */}
        <div className="grid grid-cols-3 gap-8 mb-16 max-w-lg mx-auto">
          {Object.entries(LINKS).map(([category, links]) => (
            <div key={category} className="text-center">
              <h4 className="text-white text-[10px] font-semibold uppercase tracking-widest mb-4">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(e) => handleLink(e, link.href)}
                      className="text-gray-500 hover:text-teal-400 text-sm transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-700 text-sm">© 2026 Fluent. All rights reserved.</p>
          <p className="text-gray-700 text-xs">Built for the future of voice.</p>
        </div>
      </div>
    </footer>
  );
}
