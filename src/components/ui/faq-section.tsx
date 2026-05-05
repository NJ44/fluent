"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const FAQS = [
  {
    q: "How long does it take to clone my voice?",
    a: "Just 30 seconds of recorded audio is enough. Our model analyzes your unique vocal patterns — timbre, cadence, breath — and builds a high-fidelity clone in the background while you go on with your day.",
  },
  {
    q: "How accurate is the voice clone?",
    a: "Aloud achieves a 99.2% voice match score on standard speaker-verification benchmarks. In blind listening tests, people can't reliably distinguish our output from the real thing.",
  },
  {
    q: "How fast is speech generation?",
    a: "Sub-second. Average generation latency is ~0.8s end-to-end, which means you hear your cloned voice almost as soon as you finish typing. No buffering, no waiting.",
  },
  {
    q: "Is my voice data private?",
    a: "Completely. Your voice model lives encrypted in your account and is never shared, sold, or used to train other models. You can permanently delete it at any time with a single tap.",
  },
  {
    q: "When does the private beta open?",
    a: "We're rolling out access in waves starting soon. Drop your email in the form above and you'll be first to know when your spot is ready. Early beta users also lock in the lowest pricing tier, forever.",
  },
  {
    q: "What languages and accents are supported?",
    a: "The initial beta supports English in any accent — your clone preserves your accent as part of what makes it sound like you. Multi-language support (Spanish, French, Hebrew, and more) is on the roadmap for Q3 2026.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-28 px-6 bg-slate-50 relative overflow-hidden">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-teal-100/40 blur-3xl pointer-events-none" />

      <div className="relative max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs tracking-widest uppercase text-teal-600 font-semibold">FAQ</span>
          <h3 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            Questions &{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-600">
              answers.
            </span>
          </h3>
        </div>

        <div className="space-y-2">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all duration-300 hover:border-teal-300 shadow-sm"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left focus:outline-none group"
                  aria-expanded={isOpen}
                >
                  <span className="text-slate-800 font-medium text-base group-hover:text-teal-700 transition-colors duration-200">
                    {item.q}
                  </span>
                  <Plus
                    className="flex-shrink-0 w-4 h-4 text-teal-600 transition-transform duration-300"
                    style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
                  />
                </button>

                <div
                  style={{
                    maxHeight: isOpen ? "400px" : "0px",
                    transition: "max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                    overflow: "hidden",
                  }}
                >
                  <p className="px-6 pb-5 text-slate-500 text-sm leading-relaxed">
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
