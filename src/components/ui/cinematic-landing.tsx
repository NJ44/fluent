"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Mic, AudioWaveform, Zap } from "lucide-react";
import { FishyButton } from "@/components/ui/fishy-button";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface CinematicLandingProps {
  onSignup?: (email: string) => void;
}

export function CinematicLanding({ onSignup }: CinematicLandingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const card = cardRef.current;
    if (!container || !card) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "+=6000",
          scrub: 1.2,
          pin: true,
          anticipatePin: 1,
        },
      });

      tl.fromTo(card,
        { y: "100vh", scale: 0.85, borderRadius: "32px" },
        { y: "0vh", scale: 1, borderRadius: "0px", duration: 3, ease: "power2.out" }
      )
      .to(card, { scale: 0.9, borderRadius: "24px", duration: 2, ease: "power2.inOut" }, "+=1");
    }, container);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const mockup = mockupRef.current;
    if (!mockup) return;

    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = mockup.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const rx = ((e.clientY - cy) / rect.height) * 12;
        const ry = (-(e.clientX - cx) / rect.width) * 12;
        mockup.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
    };

    const handleMouseLeave = () => {
      cancelAnimationFrame(rafRef.current);
      mockup.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    onSignup?.(email);
    setSubmitted(true);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .depth-card {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #020d1a 0%, #041628 40%, #061e35 70%, #04111f 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .depth-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 60% 50% at 50% 60%, rgba(0,200,150,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .mockup-phone {
          width: 240px;
          background: #0a1520;
          border-radius: 36px;
          border: 2px solid rgba(255,255,255,0.08);
          box-shadow: 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
          overflow: hidden;
          transition: transform 0.15s ease-out;
          flex-shrink: 0;
        }
        .mockup-screen {
          padding: 28px 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .waveform-bar {
          display: inline-block;
          width: 3px;
          border-radius: 2px;
          background: #00c896;
          animation: wb-bar 1.2s ease-in-out infinite alternate;
        }
        .hardware-btn {
          background: rgba(255,255,255,0.08);
        }
        @keyframes wb-bar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
        .cinematic-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(0,200,150,0.1);
          border: 1px solid rgba(0,200,150,0.2);
          border-radius: 999px;
          color: #5eead4;
          font-size: 12px;
          font-weight: 500;
          backdrop-filter: blur(8px);
          white-space: nowrap;
        }
      ` }} />

      <div ref={containerRef} style={{ position: "relative", height: "100vh", overflow: "hidden" }}>
        {/* Background text layer */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", zIndex: 0,
          background: "#000", padding: "0 24px", textAlign: "center",
        }}>
          <p style={{ color: "rgba(255,255,255,0.12)", fontSize: "clamp(40px,8vw,100px)", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", userSelect: "none" }}>
            YOUR VOICE
          </p>
        </div>

        {/* Pinned deep-blue card */}
        <div ref={cardRef} className="depth-card" style={{ zIndex: 10 }}>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 48,
            maxWidth: 960, width: "100%", padding: "0 32px",
          }}>
            {/* Headline */}
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#00c896", fontWeight: 600 }}>
                Powered by Fluent AI
              </span>
              <h2 style={{ marginTop: 16, fontSize: "clamp(32px,5vw,64px)", fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
                Clone your voice.<br />
                <span style={{ background: "linear-gradient(90deg,#00c896,#00e5d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Sound like yourself.
                </span>
              </h2>
              <p style={{ marginTop: 16, color: "rgba(255,255,255,0.5)", fontSize: 16, maxWidth: 480, margin: "16px auto 0" }}>
                Fluent's private beta is opening soon. Drop your email and we'll reach out when your spot is ready.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 48, flexWrap: "wrap", justifyContent: "center" }}>
              {/* iPhone mockup */}
              <div ref={mockupRef} className="mockup-phone" style={{ position: "relative" }}>
                {/* Notch */}
                <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
                  <div style={{ width: 80, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }} />
                </div>

                <div className="mockup-screen">
                  {/* Status */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Fluent</span>
                    <span style={{ color: "#00c896", fontSize: 11, fontWeight: 600 }}>● Recording</span>
                  </div>

                  {/* Mic ring */}
                  <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
                    <div style={{ position: "relative", width: 72, height: 72 }}>
                      <svg width="72" height="72" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
                        <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(0,200,150,0.15)" strokeWidth="3" />
                        <circle cx="36" cy="36" r="30" fill="none" stroke="#00c896" strokeWidth="3"
                          strokeDasharray="188" strokeDashoffset="47" strokeLinecap="round" />
                      </svg>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Mic style={{ width: 24, height: 24, color: "#00c896" }} />
                      </div>
                    </div>
                  </div>

                  {/* Waveform bars */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, height: 36 }}>
                    {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6, 1, 0.7, 0.4, 0.8, 0.5].map((h, i) => (
                      <span
                        key={i}
                        className="waveform-bar"
                        style={{ height: `${h * 100}%`, animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>

                  {/* Zap widget */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "rgba(0,200,150,0.06)", borderRadius: 12, border: "1px solid rgba(0,200,150,0.12)" }}>
                    <Zap style={{ width: 14, height: 14, color: "#00c896", flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Generation time</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>~0.8s</p>
                    </div>
                  </div>

                  {/* Waveform icon row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <AudioWaveform style={{ width: 14, height: 14, color: "rgba(0,200,150,0.6)" }} />
                    <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(0,200,150,0.3), transparent)" }} />
                  </div>
                </div>

                {/* Hardware buttons */}
                <div style={{ position: "absolute", top: 120, left: -3, width: 3, height: 25, background: "rgba(255,255,255,0.08)", borderRadius: "4px 0 0 4px" }} />
                <div style={{ position: "absolute", top: 160, left: -3, width: 3, height: 45, background: "rgba(255,255,255,0.08)", borderRadius: "4px 0 0 4px" }} />
                <div style={{ position: "absolute", top: 140, right: -3, width: 3, height: 55, background: "rgba(255,255,255,0.08)", borderRadius: "0 4px 4px 0" }} />
              </div>

              {/* Badges + form */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 340 }}>
                <div className="cinematic-badge">
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00c896", display: "inline-block" }} />
                  99.2% voice match accuracy
                </div>
                <div className="cinematic-badge">
                  <Zap style={{ width: 12, height: 12 }} />
                  ~0.8s generation time
                </div>

                <div style={{ marginTop: 8 }}>
                  {submitted ? (
                    <div style={{ padding: "16px 24px", background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.3)", borderRadius: 14, color: "#5eead4", fontWeight: 600 }}>
                      You're on the list — we'll be in touch soon.
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        style={{
                          padding: "14px 20px", borderRadius: 14, background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14,
                          outline: "none", width: "100%", boxSizing: "border-box",
                        }}
                      />
                      <FishyButton
                        type="submit"
                        className="button--2"
                        width="150px"
                        height="50px"
                        borderRadius="14px"
                      >
                        Join Beta
                      </FishyButton>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
