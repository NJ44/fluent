"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Mic } from 'lucide-react';
import { FishyButton } from '@/components/ui/fishy-button';

const SonicWaveformCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const lineCount = 60;
      const segmentCount = 80;
      const height = canvas.height / 2;

      for (let i = 0; i < lineCount; i++) {
        ctx.beginPath();
        const progress = i / lineCount;
        const colorIntensity = Math.sin(progress * Math.PI);
        ctx.strokeStyle = `rgba(13, 148, 136, ${colorIntensity * 0.25})`;
        ctx.lineWidth = 1.5;

        for (let j = 0; j < segmentCount + 1; j++) {
          const x = (j / segmentCount) * canvas.width;
          const distToMouse = Math.hypot(x - mouse.x, height - mouse.y);
          const mouseEffect = Math.max(0, 1 - distToMouse / 400);
          const noise = Math.sin(j * 0.1 + time + i * 0.2) * 20;
          const spike = Math.cos(j * 0.2 + time + i * 0.1) * Math.sin(j * 0.05 + time) * 50;
          const y = height + noise + spike * (1 + mouseEffect * 2);

          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      time += 0.02;
      animationFrameId = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    resizeCanvas();
    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 w-full h-full bg-white" />;
};

interface SonicHeroProps {
  onSubmit?: (email: string) => Promise<void> | void;
}

export const SonicWaveformHero = ({ onSubmit }: SonicHeroProps) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const fadeUpVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.2 + 0.5, duration: 0.8, ease: 'easeInOut' },
    }),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await onSubmit?.(email);
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden">
      <SonicWaveformCanvas />
      {/* Fade edges to white */}
      <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-white/60 z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-white/40 z-10 pointer-events-none" />

      <div className="relative z-20 text-center p-6 max-w-3xl mx-auto">
        <motion.div
          custom={0} variants={fadeUpVariants} initial="hidden" animate="visible"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 mb-6"
        >
          <Mic className="h-4 w-4 text-teal-600" />
          <span className="text-sm font-medium text-teal-700">Early Access Beta</span>
        </motion.div>

        <motion.h1
          custom={1} variants={fadeUpVariants} initial="hidden" animate="visible"
          className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 pb-6 bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-500"
        >
          Make any call.<br />Without speaking.
        </motion.h1>

        <motion.p
          custom={2} variants={fadeUpVariants} initial="hidden" animate="visible"
          className="max-w-xl mx-auto text-base md:text-lg text-slate-500 mb-10"
        >
          You type what to say. Your cloned voice makes the call. You follow the transcript live.
        </motion.p>

        <motion.div custom={3} variants={fadeUpVariants} initial="hidden" animate="visible">
          {submitted ? (
            <div className="flex items-center justify-center gap-2 px-4 sm:px-8 py-4 bg-teal-50 border border-teal-300 rounded-xl text-teal-700 font-semibold text-sm sm:text-lg text-center">
              You're on the list! We'll be in touch.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 justify-center">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={loading}
                className="px-5 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all w-full sm:w-72 disabled:opacity-60"
              />
              {loading ? (
                <div className="w-full sm:w-[150px] h-[50px] flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="w-full sm:w-auto flex justify-center [&_.button]:!w-full [&_.button]:!mx-0 sm:[&_.button]:!w-[150px]">
                  <FishyButton
                    type="submit"
                    className="button--2"
                    width="150px"
                    height="50px"
                    borderRadius="14px"
                  >
                    Join Beta
                  </FishyButton>
                </div>
              )}
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};
