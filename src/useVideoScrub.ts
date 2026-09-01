import { useEffect, useRef, useState, type RefObject } from 'react';

type BankFrame = {
  ts: number;
  blob: Blob;
};

const LERP_TAU = 8;
const SNAP = 0.002;
const LRU_MAX = 24;
const LEAD = 24;
const WATCHDOG = 60000;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function nearestIndex(bank: BankFrame[], time: number) {
  const target = time * 1_000_000;
  let low = 0;
  let high = bank.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (bank[mid].ts < target) low = mid + 1;
    else high = mid;
  }

  if (low > 0 && Math.abs(bank[low - 1].ts - target) < Math.abs(bank[low].ts - target)) {
    return low - 1;
  }

  return low;
}

function drawImageCover(context: CanvasRenderingContext2D, image: ImageBitmap, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function getTrackDescription(track: any) {
  const entry = track?.mdia?.minf?.stbl?.stsd?.entries?.[0];
  const box = entry?.avcC ?? entry?.hvcC ?? entry?.vpcC ?? entry?.av1C;
  return box ? new Uint8Array(box.buffer ?? box.data ?? []) : undefined;
}

export function useVideoScrub(videoSrc: string) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [canvasLive, setCanvasLive] = useState(false);
  const [reverted, setReverted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bankRef: { current: BankFrame[] } = { current: [] };
    const lru = new Map<number, ImageBitmap | null>();
    let duration = 0;
    let current = 0;
    let target = 0;
    let ready = false;
    let seeking = false;
    let frame = 0;
    let last = performance.now();
    let cancelled = false;
    let watchdog = 0;
    let buildStarted = false;

    const computeProgress = () => {
      const container = containerRef.current;
      const span = container ? container.offsetHeight - window.innerHeight : document.documentElement.scrollHeight - window.innerHeight;
      return clamp(span <= 0 ? 0 : window.scrollY / span);
    };

    const evict = () => {
      while (lru.size > LRU_MAX) {
        const first = lru.keys().next().value as number | undefined;
        if (first === undefined) break;
        const bitmap = lru.get(first);
        bitmap?.close?.();
        lru.delete(first);
      }
    };

    const warmLRU = async (index: number) => {
      const bank = bankRef.current;
      for (let i = Math.max(0, index - 1); i <= Math.min(bank.length - 1, index + 2); i += 1) {
        if (!lru.has(i)) {
          lru.set(i, null);
          createImageBitmap(bank[i].blob)
            .then((bitmap) => {
              if (!cancelled) {
                lru.set(i, bitmap);
                evict();
              } else {
                bitmap.close();
              }
            })
            .catch(() => lru.delete(i));
        }
      }
    };

    const drawNearestFrame = (time: number) => {
      const bank = bankRef.current;
      if (!ready || bank.length === 0) return false;
      const index = nearestIndex(bank, time);
      void warmLRU(index);
      const bitmap = lru.get(index);
      if (!bitmap) return false;
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawImageCover(context, bitmap, canvas.width, canvas.height);
      if (!canvasLive) setCanvasLive(true);
      return true;
    };

    const seekFallback = () => {
      if (seeking || Math.abs(video.currentTime - current) <= 0.01 || !Number.isFinite(current)) return;
      seeking = true;
      try {
        video.currentTime = current;
      } finally {
        window.setTimeout(() => {
          seeking = false;
        }, 80);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const p = computeProgress();
      setScrollProgress(p);

      if (duration > 0) {
        target = p * duration;
        if (reduced) current = target;
        else {
          current += (target - current) * (1 - Math.exp(-dt * LERP_TAU));
          if (Math.abs(target - current) < SNAP) current = target;
        }

        if (!drawNearestFrame(current)) seekFallback();
      }

      frame = requestAnimationFrame(tick);
    };

    const setVideoDuration = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) duration = video.duration;
    };

    const buildFrameBank = async (hardwareAcceleration: HardwareAcceleration = 'prefer-hardware') => {
      if (reduced || !('VideoDecoder' in window) || !('EncodedVideoChunk' in window)) return;
      let decoder: any = null;
      let decoded = 0;

      try {
        const MP4Box = (await import('mp4box')).default;
        const response = await fetch(videoSrc);
        const raw = await response.arrayBuffer();
        const file = MP4Box.createFile();
        const samples: any[] = [];

        await new Promise<void>((resolve, reject) => {
          file.onError = reject;
          file.onReady = (info: any) => {
            const track = info.videoTracks?.[0];
            if (!track) {
              reject(new Error('No video track'));
              return;
            }

            duration = duration || Number(track.duration / track.timescale);
            const config: VideoDecoderConfig = {
              codec: track.codec,
              codedWidth: track.video?.width,
              codedHeight: track.video?.height,
              description: getTrackDescription(track),
              hardwareAcceleration,
            };

            decoder = new VideoDecoder({
              output: (videoFrame) => {
                decoded += 1;
                const offscreen = new OffscreenCanvas(videoFrame.displayWidth || 1920, videoFrame.displayHeight || 1080);
                const offscreenContext = offscreen.getContext('2d');
                offscreenContext?.drawImage(videoFrame, 0, 0, offscreen.width, offscreen.height);
                const ts = videoFrame.timestamp;
                videoFrame.close();
                void offscreen.convertToBlob({ type: 'image/webp', quality: 0.82 }).then((blob) => {
                  if (!cancelled) bankRef.current = [...bankRef.current, { ts, blob }].sort((a, b) => a.ts - b.ts);
                });
              },
              error: reject,
            });
            decoder.configure(config);
            file.setExtractionOptions(track.id, null, { nbSamples: LEAD });
            file.start();
          };
          file.onSamples = (_id: number, _user: unknown, sampleBatch: any[]) => {
            samples.push(...sampleBatch);
            for (const sample of sampleBatch) {
              if (!decoder || decoder.decodeQueueSize > LEAD) continue;
              decoder.decode(
                new EncodedVideoChunk({
                  type: sample.is_sync ? 'key' : 'delta',
                  timestamp: Math.round((sample.cts / sample.timescale) * 1_000_000),
                  duration: Math.round((sample.duration / sample.timescale) * 1_000_000),
                  data: sample.data,
                }),
              );
            }
          };

          const buffer = raw as ArrayBuffer & { fileStart?: number };
          buffer.fileStart = 0;
          file.appendBuffer(buffer);
          file.flush();
          window.setTimeout(resolve, 0);
        });

        await decoder?.flush();
        if (decoded > 0 && !cancelled) ready = true;
      } catch {
        if (hardwareAcceleration === 'prefer-hardware') {
          await buildFrameBank('prefer-software');
        } else if (!cancelled) {
          setReverted(true);
          ready = false;
          setCanvasLive(false);
        }
      } finally {
        decoder?.close();
      }
    };

    const startBuild = () => {
      if (buildStarted) return;
      buildStarted = true;
      void buildFrameBank();
    };

    video.addEventListener('loadedmetadata', setVideoDuration);
    window.addEventListener('resize', setVideoDuration);
    window.addEventListener('orientationchange', setVideoDuration);
    setVideoDuration();
    frame = requestAnimationFrame(tick);
    if (document.readyState === 'complete') startBuild();
    else window.addEventListener('load', startBuild, { once: true });
    watchdog = window.setTimeout(() => {
      if (!canvasLive && !cancelled) {
        ready = false;
        setReverted(true);
        setCanvasLive(false);
      }
    }, WATCHDOG);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(watchdog);
      video.removeEventListener('loadedmetadata', setVideoDuration);
      window.removeEventListener('resize', setVideoDuration);
      window.removeEventListener('orientationchange', setVideoDuration);
      window.removeEventListener('load', startBuild);
      lru.forEach((bitmap) => bitmap?.close?.());
      lru.clear();
    };
  }, [videoSrc]);

  return { containerRef, videoRef, canvasRef, scrollProgress, canvasLive, reverted } satisfies {
    containerRef: RefObject<HTMLDivElement>;
    videoRef: RefObject<HTMLVideoElement>;
    canvasRef: RefObject<HTMLCanvasElement>;
    scrollProgress: number;
    canvasLive: boolean;
    reverted: boolean;
  };
}
