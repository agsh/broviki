'use client';

import { useEffect, useRef, useState } from 'react';

interface WebRtcPlayerProps {
  /** Absolute WHEP URL, e.g. http://host:8889/cam_…/whep */
  whepUrl: string;
  className?: string;
}

type IceServer = RTCIceServer;

function unquoteCredential(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value;
  }
}

/** Parse WHEP OPTIONS `Link` header into RTCIceServer list (MediaMTX). */
function iceServersFromLinkHeader(link: string | null): IceServer[] {
  if (!link) return [];

  return link.split(', ').flatMap((part) => {
    const match = part.match(
      /^<(.+?)>; rel="ice-server"(; username="(.*?)"; credential="(.*?)"; credential-type="password")?/i,
    );
    if (!match) return [];

    const server: IceServer = { urls: [match[1]] };
    if (match[3] !== undefined) {
      server.username = unquoteCredential(match[3]);
      server.credential = unquoteCredential(match[4]);
      // server.credentialType = 'password';
    }
    return [server];
  });
}

function parseOfferIce(sdp: string) {
  let iceUfrag = '';
  let icePwd = '';
  const medias: string[] = [];

  for (const line of sdp.split('\r\n')) {
    if (line.startsWith('m=')) medias.push(line.slice(2));
    else if (!iceUfrag && line.startsWith('a=ice-ufrag:')) iceUfrag = line.slice(12);
    else if (!icePwd && line.startsWith('a=ice-pwd:')) icePwd = line.slice(10);
  }

  return { iceUfrag, icePwd, medias };
}

function trickleFragment(
  offerData: ReturnType<typeof parseOfferIce>,
  candidates: RTCIceCandidate[],
): string {
  const byMid: Record<number, RTCIceCandidate[]> = {};
  for (const candidate of candidates) {
    const mid = candidate.sdpMLineIndex ?? 0;
    (byMid[mid] ??= []).push(candidate);
  }

  let frag = `a=ice-ufrag:${offerData.iceUfrag}\r\na=ice-pwd:${offerData.icePwd}\r\n`;
  offerData.medias.forEach((media, mid) => {
    const list = byMid[mid];
    if (!list?.length) return;
    frag += `m=${media}\r\na=mid:${mid}\r\n`;
    for (const candidate of list) {
      frag += `a=${candidate.candidate}\r\n`;
    }
  });
  return frag;
}

/**
 * WebRTC player via MediaMTX WHEP (POST SDP offer → answer + trickle ICE).
 * Replaces the previous HLS/MSE path for lower latency.
 */
export default function WebRtcPlayer({ whepUrl, className }: WebRtcPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !whepUrl) return;

    let cancelled = false;
    let pc: RTCPeerConnection | null = null;
    let sessionUrl: string | null = null;
    let offerData: ReturnType<typeof parseOfferIce> | null = null;
    const queued: RTCIceCandidate[] = [];

    setError(null);

    const sendCandidates = async (candidates: RTCIceCandidate[]) => {
      if (!sessionUrl || !offerData || candidates.length === 0) return;
      const response = await fetch(sessionUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/trickle-ice-sdpfrag',
          'If-Match': '*',
        },
        body: trickleFragment(offerData, candidates),
      });
      if (!response.ok && response.status !== 204) {
        throw new Error(`ICE PATCH ${response.status}`);
      }
    };

    const start = async () => {
      const optionsRes = await fetch(whepUrl, { method: 'OPTIONS' });
      const iceServers = iceServersFromLinkHeader(optionsRes.headers.get('Link'));

      pc = new RTCPeerConnection({ iceServers });
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.createDataChannel('');

      pc.ontrack = (event) => {
        if (cancelled || !video) return;
        video.srcObject = event.streams[0] ?? new MediaStream([event.track]);
        void video.play().catch(() => undefined);
      };

      pc.onconnectionstatechange = () => {
        if (cancelled) return;
        if (pc?.connectionState === 'failed' || pc?.connectionState === 'closed') {
          setError(`WebRTC ${pc.connectionState}`);
        }
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        if (!sessionUrl) {
          queued.push(event.candidate);
          return;
        }
        void sendCandidates([event.candidate]).catch((err) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'ICE failed');
          }
        });
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      offerData = parseOfferIce(offer.sdp ?? '');

      const post = await fetch(whepUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp ?? '',
      });

      if (!post.ok) {
        const detail = await post.text();
        throw new Error(
          post.status === 404
            ? 'stream not found'
            : `WHEP ${post.status}${detail ? `: ${detail.slice(0, 120)}` : ''}`,
        );
      }

      const location = post.headers.get('location');
      if (location) {
        sessionUrl = new URL(location, whepUrl).toString();
      }

      const answerSdp = await post.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      if (queued.length && sessionUrl) {
        const batch = queued.splice(0, queued.length);
        await sendCandidates(batch);
      }
    };

    void start().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'WebRTC failed');
      }
    });

    return () => {
      cancelled = true;
      if (sessionUrl) {
        void fetch(sessionUrl, { method: 'DELETE' }).catch(() => undefined);
      }
      pc?.close();
      video.srcObject = null;
    };
  }, [whepUrl]);

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full max-h-full max-w-full bg-black object-contain"
        // controls
        muted
        playsInline
        autoPlay
      />
      {error ? (
        <p className="absolute bottom-2 left-2 z-10 rounded bg-red-900/80 px-2 py-1 text-xs text-white">
          WebRTC error: {error}
        </p>
      ) : null}
    </div>
  );
}
