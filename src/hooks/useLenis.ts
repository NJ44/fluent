import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type Lenis from 'lenis';

type WindowWithLenis = Window & typeof globalThis & { __lenis?: Lenis };

export const useLenis = () => {
  const lenisRef = useRef<Lenis | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Disable on all app/auth pages
    const isAppPage = ['/sign-in', '/sign-up', '/dashboard', '/onboarding', '/settings', '/calls', '/history'].some(
      (p) => location.pathname.startsWith(p)
    );
    if (isAppPage) return;

    // Respect user's reduced-motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let isRunning = true;
    let rafId: number;
    let cleanup: (() => void) | undefined;

    import('lenis').then(({ default: LenisClass }) => {
      if (!isRunning) return;

      const customEasing = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

      const lenis = new LenisClass({
        duration: 1.5,
        easing: customEasing,
        infinite: false,
        lerp: 0.15,
        wheelMultiplier: 0.8,
        touchMultiplier: 1.2,
        smoothWheel: true,
      });

      (window as WindowWithLenis).__lenis = lenis;
      lenisRef.current = lenis;

      function raf(time: number) {
        if (isRunning) {
          lenis.raf(time);
          rafId = requestAnimationFrame(raf);
        }
      }

      rafId = requestAnimationFrame(raf);

      const handleVisibilityChange = () => {
        if (document.hidden) {
          isRunning = false;
          cancelAnimationFrame(rafId);
        } else {
          isRunning = true;
          rafId = requestAnimationFrame(raf);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      cleanup = () => {
        isRunning = false;
        cancelAnimationFrame(rafId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        lenis.destroy();
        lenisRef.current = null;
        delete (window as WindowWithLenis).__lenis;
      };
    });

    return () => {
      isRunning = false;
      if (cleanup) cleanup();
    };
  }, [location.pathname]);

  return lenisRef.current;
};
