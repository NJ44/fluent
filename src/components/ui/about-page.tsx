"use client";

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface AboutPageProps {
  achievements?: Array<{ label: string; value: string }>;
}

const defaultAchievements = [
  { label: "Voices Cloned", value: "500+" },
  { label: "Words Generated", value: "10M+" },
  { label: "Voice Accuracy", value: "99.2%" },
  { label: "Generation Time", value: "~0.8s" },
];

export default function AboutPage({
  achievements = defaultAchievements,
}: AboutPageProps) {
  void achievements;
  return (
    <div className="flex flex-col">

      {/* HERO SECTION */}
      <section className="py-16 md:py-28 bg-white">
        <div className="mx-auto max-w-6xl space-y-8 px-6">
          <img
            className="rounded-xl object-cover w-full h-[240px] md:h-[460px]"
            src="https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1200&h=460&fit=crop&q=80"
            alt="Voice recording studio"
          />

          <div className="grid gap-6 md:grid-cols-2 md:gap-12">
            <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 leading-snug">
              The Fluent{" "}
              <span className="text-teal-600">ecosystem</span>{" "}
              <span className="text-slate-400">
                brings together voice models, generation APIs, and real-time speech infrastructure.
              </span>
            </h1>
            <div className="space-y-6 text-slate-500">
              <p>
                Fluent is evolving beyond voice cloning. It supports an entire ecosystem — from real-time speech generation to APIs and SDKs helping developers build the next generation of voice-powered applications.
              </p>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="gap-1 pr-1.5"
              >
                <Link to="/#features">
                  <span>See Features</span>
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="mx-auto max-w-6xl space-y-16 px-6">

          {/* Header */}
          <div className="grid gap-6 text-center md:grid-cols-2 md:gap-12 md:text-left">
            <h1 className="text-4xl md:text-5xl font-semibold text-slate-900">
              About Us
            </h1>
            <p className="text-slate-500">
              Fluent is a team dedicated to making voice technology accessible, authentic, and instant. We believe your voice is your identity — and it should be available everywhere you need it.
            </p>
          </div>

          {/* Cards layout */}
          <div className="flex flex-col md:flex-row gap-6">

            {/* LEFT BIG IMAGE */}
            <div className="md:flex-1">
              <img
                src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&h=700&fit=crop&q=80"
                alt="Recording studio"
                className="rounded-xl object-cover w-full h-[300px] sm:h-[360px] md:h-full min-h-[400px]"
              />
            </div>

            {/* RIGHT TWO CARDS */}
            <div className="flex flex-col gap-6 md:flex-1">

              {/* Card 1 — dark */}
              <motion.div
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 250, damping: 20 }}
                className="relative overflow-hidden rounded-xl bg-slate-900 text-white shadow-lg"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.4 }}
                  className="relative h-52 w-full overflow-hidden"
                >
                  <img
                    src="https://images.unsplash.com/photo-1516571748831-5d81767b788d?w=600&h=400&fit=crop&q=80"
                    alt="Dark studio microphone"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-0 h-32 w-full bg-gradient-to-t from-slate-900 via-slate-900/70 to-transparent" />
                </motion.div>
                <div className="p-6">
                  <h3 className="text-xl font-bold">Built for Speed</h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Sub-second generation means Fluent fits into real-time workflows, voice assistants, and live interactions — without compromise.
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    className="mt-4 border-white/20 text-white hover:bg-white hover:text-slate-900"
                  >
                    <Link to="/#features">Learn More</Link>
                  </Button>
                </div>
              </motion.div>

              {/* Card 2 — image overlay */}
              <motion.div
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 250, damping: 20 }}
                className="relative overflow-hidden rounded-xl shadow-lg min-h-[220px]"
              >
                <img
                  src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop&q=80"
                  alt="Voice performance"
                  className="h-full w-full object-cover absolute inset-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-xl font-bold">Authentic by Design</h3>
                  <p className="mt-2 text-sm text-slate-200">
                    Every nuance, breath, and cadence — cloned at 99.2% accuracy so your voice stays unmistakably yours.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
