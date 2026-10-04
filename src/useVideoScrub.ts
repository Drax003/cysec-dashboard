import { useEffect, useRef, useState, type RefObject } from 'react';

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function useVideoScrub(_videoSrc: string) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const lastProgress = useRef(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    const computeProgress = () => {
      const container = containerRef.current;
      const span = container ? container.offsetHeight - window.innerHeight : document.documentElement.scrollHeight - window.innerHeight;
      return clamp(span <= 0 ? 0 : window.scrollY / span);
    };

    const update = () => {
      frame.current = null;
      const next = computeProgress();
      if (Math.abs(next - lastProgress.current) > 0.002) {
        lastProgress.current = next;
        setScrollProgress(next);
      }
    };

    const schedule = () => {
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(update);
    };

    const startVideo = () => {
      if (!video) return;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      void video.play().catch(() => {
        // Browser autoplay can be conservative; the scroll-driven CSS motion still runs.
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') startVideo();
    };

    startVideo();
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { containerRef, videoRef, canvasRef, scrollProgress, canvasLive: false, reverted: true } satisfies {
    containerRef: RefObject<HTMLDivElement>;
    videoRef: RefObject<HTMLVideoElement>;
    canvasRef: RefObject<HTMLCanvasElement>;
    scrollProgress: number;
    canvasLive: boolean;
    reverted: boolean;
  };
}
