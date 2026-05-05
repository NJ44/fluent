'use client';

import { Mic, AudioWaveform, Zap, Globe, ArrowUp, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ── Illustrations ────────────────────────────────────────────────────────── */

const RecordingIllustration = () => (
  <Card className="mt-8 aspect-video p-5 bg-white">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-semibold text-slate-700">Recording</span>
      </div>
      <span className="text-xs font-mono text-slate-400">0:28 / 0:30</span>
    </div>
    <div className="flex items-center justify-center gap-[3px] h-12 mb-4">
      {[0.35, 0.6, 0.9, 0.75, 1, 0.8, 0.55, 0.95, 0.7, 0.45, 0.85, 0.6, 0.4, 0.7, 0.9].map((h, i) => (
        <div
          key={i}
          className="rounded-full bg-teal-500"
          style={{ width: 3, height: `${h * 44}px`, opacity: 0.7 + h * 0.3 }}
        />
      ))}
    </div>
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">Voice model building…</span>
      <div className="w-6 h-6 rounded-full bg-red-100 border border-red-200 flex items-center justify-center">
        <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
      </div>
    </div>
  </Card>
);

const QualityIllustration = () => (
  <div aria-hidden className="relative mt-6 mb-0">
    <Card className="w-4/5 translate-y-4 p-4 transition-transform duration-200 ease-in-out group-hover:-rotate-2">
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Original voice</div>
      <div className="flex items-center gap-[2px] h-8">
        {[0.5, 0.8, 1, 0.7, 0.9, 0.6, 0.85, 0.75, 1, 0.65].map((h, i) => (
          <div key={i} className="rounded-full bg-slate-300" style={{ width: 4, height: `${h * 28}px` }} />
        ))}
      </div>
    </Card>
    <Card className="absolute -top-3 right-0 w-4/5 translate-y-4 p-4 transition-transform duration-200 ease-in-out group-hover:rotate-2">
      <div className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider mb-3">Cloned voice — 99.2% match</div>
      <div className="flex items-center gap-[2px] h-8">
        {[0.5, 0.78, 0.98, 0.71, 0.89, 0.61, 0.83, 0.74, 0.99, 0.64].map((h, i) => (
          <div key={i} className="rounded-full bg-teal-400" style={{ width: 4, height: `${h * 28}px` }} />
        ))}
      </div>
    </Card>
  </div>
);

const GenerationIllustration = () => (
  <Card
    aria-hidden
    className="mt-6 aspect-video translate-y-4 p-4 pb-6 transition-transform duration-200 group-hover:translate-y-0 bg-white"
  >
    <div className="w-fit mb-3">
      <Zap className="w-3.5 h-3.5 fill-teal-400 stroke-teal-400" />
      <p className="mt-2 line-clamp-2 text-sm text-slate-700">
        "Hello, this is a test of Aloud's voice generation engine."
      </p>
    </div>
    <div className="flex items-center gap-2 mb-3">
      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full w-4/5 rounded-full bg-teal-400 transition-all" />
      </div>
      <span className="text-[10px] font-mono text-teal-600 font-bold">0.8s</span>
    </div>
    <div className="bg-slate-50 -mx-3 -mb-3 mt-1 rounded-lg p-3 space-y-3">
      <div className="text-slate-400 text-sm">Generate speech</div>
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="size-7 rounded-2xl bg-transparent shadow-none border-slate-200">
            <Plus className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="icon" className="size-7 rounded-2xl bg-transparent shadow-none border-slate-200">
            <Globe className="w-3 h-3" />
          </Button>
        </div>
        <Button size="icon" className="size-7 rounded-2xl bg-teal-600 hover:bg-teal-700">
          <ArrowUp strokeWidth={3} className="w-3 h-3" />
        </Button>
      </div>
    </div>
  </Card>
);

/* ── Section ──────────────────────────────────────────────────────────────── */

export default function FeaturesSection() {
  return (
    <section className="py-24 bg-white">
      <div className="mx-auto w-full max-w-5xl px-6">
        <h2 className="text-slate-900 max-w-2xl text-balance text-4xl font-semibold tracking-tight">
          Everything you need to make any call — without hesitation.
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1 */}
          <Card variant="soft" className="overflow-hidden p-6">
            <Mic className="text-teal-600 size-5" />
            <h3 className="text-slate-900 mt-5 text-lg font-semibold">Sounds like you, not a bot</h3>
            <p className="text-slate-500 mt-3 text-balance text-sm leading-relaxed">
              Clone your voice in 30 seconds. The person on the other end hears your voice — your tone, your cadence, your timbre. Not a generic AI.
            </p>
            <RecordingIllustration />
          </Card>

          {/* Card 2 */}
          <Card variant="soft" className={cn("group overflow-hidden px-6 pt-6")}>
            <AudioWaveform className="text-teal-600 size-5" />
            <h3 className="text-slate-900 mt-5 text-lg font-semibold">You're in control</h3>
            <p className="text-slate-500 mt-3 text-balance text-sm leading-relaxed">
              Watch the live transcript as the call unfolds. Jump in with one tap anytime. You're present — just not speaking.
            </p>
            <QualityIllustration />
          </Card>

          {/* Card 3 */}
          <Card variant="soft" className={cn("group overflow-hidden px-6 pt-6")}>
            <Zap className="text-teal-600 size-5" />
            <h3 className="text-slate-900 mt-5 text-lg font-semibold">Handles the full conversation</h3>
            <p className="text-slate-500 mt-3 text-balance text-sm leading-relaxed">
              Aloud navigates back-and-forth naturally — answers questions, responds, gets to the point. Real calls. Not just voicemails.
            </p>
            <div className="mask-b-from-50 -mx-2 -mt-2 px-2 pt-2">
              <GenerationIllustration />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
