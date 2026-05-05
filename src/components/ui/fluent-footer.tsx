import type { MouseEvent } from "react";

const LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How it Works", href: "#how-it-works" },
    { label: "Join Waitlist", href: "#hero" },
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
    <footer className="border-t border-slate-100 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          {/* Brand */}
          <div className="flex flex-col items-center sm:items-start gap-1">
            <div className="flex items-center gap-2">
              <img src="/Aloud_logo.png" className="w-5 h-5 object-contain" alt="Aloud" />
              <span className="text-slate-900 font-black text-base tracking-tight">Aloud</span>
            </div>
            <p className="text-slate-400 text-xs">Say it without saying it.</p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-8 text-center sm:text-left">
            {Object.entries(LINKS).map(([category, links]) => (
              <div key={category} className={category === "Legal" ? "col-span-2 sm:col-span-1" : ""}>
                <h4 className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest mb-2">
                  {category}
                </h4>
                <ul className="space-y-1.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        onClick={(e) => handleLink(e, link.href)}
                        className="text-slate-500 hover:text-teal-600 text-xs transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-slate-400 text-xs">© 2026 Aloud. All rights reserved.</p>
          <p className="text-slate-300 text-xs">Built for the future of voice.</p>
        </div>
      </div>
    </footer>
  );
}
