'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface MsePlayerProps {
  src: string;
  className?: string;
}

/** Must match apps/mediamtx/mediamtx.yml hlsCDNSecret */
const MEDIAMTX_CDN_SECRET = 'broviki-dev-hls-cdn';

/**
 * MSE player: HLS fMP4 from MediaMTX via hls.js.
 * Sends CDN Bearer so MediaMTX skips cookieCheck (Secure cookies fail on plain HTTP).
 */
export default function MsePlayer({ src, className }: MsePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError(null);
    let hls: Hls | null = null;

    const withCdnAuth = (xhr: XMLHttpRequest) => {
      xhr.setRequestHeader('Authorization', `Bearer ${MEDIAMTX_CDN_SECRET}`);
    };

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS cannot set Authorization; fall through to hls.js when possible.
      if (!Hls.isSupported()) {
        video.src = src;
        void video.play().catch(() => undefined);
        return () => {
          video.removeAttribute('src');
          video.load();
        };
      }
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        xhrSetup: withCdnAuth,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void video.play().catch(() => undefined);
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        const detail = [data.type, data.details, data.response?.code]
          .filter(Boolean)
          .join(' / ');
        setError(detail || 'fatal');
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls?.startLoad();
        } else {
          hls?.destroy();
        }
      });
    } else {
      setError('HLS / MSE is not supported in this browser');
    }

    return () => {
      hls?.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full max-h-full max-w-full bg-black object-contain"
        controls
        muted
        playsInline
      />
      {error ? (
        <p className="absolute bottom-2 left-2 z-10 rounded bg-red-900/80 px-2 py-1 text-xs text-white">
          MSE error: {error}
        </p>
      ) : null}
    </div>
  );
}
