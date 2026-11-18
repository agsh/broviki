'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Monitor,
  Home,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Square,
  Loader,
} from 'lucide-react';
import { CameraConfig } from './camera-list';
import WebRtcPlayer from './webrtc-player';

interface VideoWindowProps {
  camera: CameraConfig | null;
  height: number;
}

const ptzButtonClass =
  'w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors touch-none select-none';

export default function VideoWindow({ camera, height }: VideoWindowProps) {
  const [isControlling, setIsControlling] = useState(false);
  const [whepUrl, setWhepUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isLoadingPlayback, setIsLoadingPlayback] = useState(false);
  const [ptzError, setPtzError] = useState<string | null>(null);
  const activeMoveRef = useRef<Promise<void> | null>(null);
  const isDraggingRef = useRef(false);

  // Start (or restart) WHEP only after explicit Connect. Disconnect / F5 → no session → no video.
  useEffect(() => {
    if (!camera?.id) {
      setWhepUrl(null);
      setPlaybackError(null);
      setIsLoadingPlayback(false);
      return;
    }

    if (camera.status !== 'connected') {
      setWhepUrl(null);
      setPlaybackError(null);
      setIsLoadingPlayback(camera.status === 'connecting');
      return;
    }

    let cancelled = false;
    setIsLoadingPlayback(true);
    setPlaybackError(null);
    setWhepUrl(null);

    const loadPlayback = async () => {
      try {
        const response = await fetch(`/api/cam/${encodeURIComponent(camera.id)}/playback`);
        const result = await response.json();
        if (cancelled) return;

        if (!result.success || (!result.whepUrl && !result.pathName)) {
          setWhepUrl(null);
          setPlaybackError(result.message || 'Playback unavailable');
          return;
        }

        // Direct MediaMTX WHEP on :8889 (use browser hostname, not 127.0.0.1 from Nest)
        const webrtcPort = 8889;
        const url = result.pathName
          ? `http://${window.location.hostname}:${webrtcPort}/${result.pathName}/whep`
          : String(result.whepUrl).replace(
              /^(https?:\/\/)(127\.0\.0\.1|localhost)(:\d+)/,
              `$1${window.location.hostname}$3`,
            );

        setWhepUrl(url);
      } catch (error) {
        if (!cancelled) {
          setWhepUrl(null);
          setPlaybackError(error instanceof Error ? error.message : 'Playback request failed');
        }
      } finally {
        if (!cancelled) setIsLoadingPlayback(false);
      }
    };

    void loadPlayback();
    return () => {
      cancelled = true;
    };
  }, [camera?.id, camera?.status, camera?.streamUri, camera?.profileToken]);

  const sendPTZCommand = useCallback(
    async (command: string, direction?: string) => {
      if (!camera) return;

      const response = await fetch('/api/cam/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cameraId: camera.id,
          command,
          direction,
          speed: 0.3,
        }),
      });

      const result = await response.json().catch(() => ({
        success: false,
        message: `PTZ HTTP ${response.status}`,
      }));
      if (!result.success) {
        const message = result.message || 'PTZ command failed';
        setPtzError(message);
        console.error('PTZ command failed:', message);
        return;
      }
      setPtzError(null);
    },
    [camera],
  );

  const startMove = useCallback(
    (command: string, direction?: string) => {
      if (isDraggingRef.current) return;
      isDraggingRef.current = true;
      setIsControlling(true);

      const move = sendPTZCommand(command, direction).finally(() => {
        activeMoveRef.current = null;
      });
      activeMoveRef.current = move;
    },
    [sendPTZCommand],
  );

  const endMove = useCallback(async () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const move = activeMoveRef.current;
    if (move) {
      await move;
    }

    await sendPTZCommand('stop');
    setIsControlling(false);
  }, [sendPTZCommand]);

  useEffect(() => {
    const handlePointerUp = () => {
      void endMove();
    };

    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [endMove]);

  if (!camera) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium mb-2">No Camera Selected</h3>
          <p>Select a camera from the list to view its video stream and properties</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex shrink-0 flex-col overflow-hidden bg-black"
      style={{ height: `${height}%` }}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Active player: WebRTC/WHEP (MSE backup in playback-backups/mse) */}
        {whepUrl ? (
          <WebRtcPlayer
            whepUrl={whepUrl}
            className="absolute inset-0 h-full w-full overflow-hidden"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white max-w-md px-4">
              <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">{camera.name || camera.hostname}</h3>
              {isLoadingPlayback || camera.status === 'connecting' ? (
                <p className="text-gray-300 flex items-center justify-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  {camera.status === 'connecting' ? 'Connecting…' : 'Preparing stream…'}
                </p>
              ) : (
                <p className="text-gray-300 mb-2">
                  {playbackError ??
                    (camera.status === 'connected'
                      ? 'Stream unavailable'
                      : 'Press Connect to start video')}
                </p>
              )}
              <p className="text-xs text-gray-400 break-all mb-3">
                Stream URL: {camera.streamUri ?? '—'}
              </p>
              {camera.snapshotUri ? (
                <img
                  src={`/api/cam/${encodeURIComponent(camera.id)}/snapshot`}
                  alt="Camera snapshot"
                  className="mx-auto max-h-48 rounded-lg object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 rounded-lg border border-gray-700 bg-gray-900/90 p-4 backdrop-blur-sm">
        <div className="flex flex-col items-center space-y-2">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
            Camera Controls
            {isControlling && <Loader className="h-4 w-4 animate-spin" />}
          </div>

          {camera.status !== 'connected' ? (
            <p className="max-w-[11rem] text-center text-xs text-gray-400">
              Connect the camera to enable PTZ
            </p>
          ) : null}

          {ptzError ? (
            <p className="max-w-[11rem] text-center text-xs text-red-400">{ptzError}</p>
          ) : null}

          <div className="grid grid-cols-3 gap-1">
            <div />
            <button
              type="button"
              disabled={camera.status !== 'connected'}
              onPointerDown={(e) => {
                e.preventDefault();
                startMove('tilt', 'up');
              }}
              className={`${ptzButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
              title="Tilt Up"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            <div />

            <button
              type="button"
              disabled={camera.status !== 'connected'}
              onPointerDown={(e) => {
                e.preventDefault();
                startMove('pan', 'left');
              }}
              className={`${ptzButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
              title="Pan Left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={camera.status !== 'connected'}
              onClick={() => void sendPTZCommand('home')}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              title="Home Position"
            >
              <Home className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={camera.status !== 'connected'}
              onPointerDown={(e) => {
                e.preventDefault();
                startMove('pan', 'right');
              }}
              className={`${ptzButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
              title="Pan Right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div />
            <button
              type="button"
              disabled={camera.status !== 'connected'}
              onPointerDown={(e) => {
                e.preventDefault();
                startMove('tilt', 'down');
              }}
              className={`${ptzButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
              title="Tilt Down"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
            <div />
          </div>

          <div className="mt-2 flex space-x-1">
            <button
              type="button"
              disabled={camera.status !== 'connected'}
              onClick={() => void sendPTZCommand('zoom', 'in')}
              className={`${ptzButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={camera.status !== 'connected'}
              onClick={() => void sendPTZCommand('zoom', 'out')}
              className={`${ptzButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={camera.status !== 'connected'}
              onClick={() => void sendPTZCommand('stop')}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-700 text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              title="Stop Movement"
            >
              <Square className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
