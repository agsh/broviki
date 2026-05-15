'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Monitor, Home, ZoomIn, ZoomOut, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Square, Loader } from 'lucide-react';
import { CameraConfig } from './camera-list';

interface VideoWindowProps {
  camera: CameraConfig | null;
  height: number;
}

const ptzButtonClass =
  'w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors touch-none select-none';

export default function VideoWindow({ camera, height }: VideoWindowProps) {
  const [isControlling, setIsControlling] = useState(false);
  const activeMoveRef = useRef<Promise<void> | null>(null);
  const isDraggingRef = useRef(false);

  const sendPTZCommand = useCallback(async (command: string, direction?: string) => {
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

    const result = await response.json();
    if (!result.success) {
      console.error('PTZ command failed:', result.message);
      throw new Error(result.message);
    }
  }, [camera]);

  const startMove = useCallback((command: string, direction?: string) => {
    if (isDraggingRef.current) return;
    isDraggingRef.current = true;
    setIsControlling(true);

    const move = sendPTZCommand(command, direction).finally(() => {
      activeMoveRef.current = null;
    });
    activeMoveRef.current = move;
  }, [sendPTZCommand]);

  const endMove = useCallback(async () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const move = activeMoveRef.current;
    if (move) {
      try {
        await move;
      } catch {
        // move error already logged
      }
    }

    try {
      await sendPTZCommand('stop');
    } catch (error) {
      console.error('PTZ stop failed:', error);
    } finally {
      setIsControlling(false);
    }
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
      className="bg-black flex flex-col relative"
      style={{ height: `${height}%` }}
    >
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-white">
          <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium mb-2">{camera.name || camera.hostname}</h3>
          <p className="text-gray-300 mb-4">Video stream would be displayed here</p>
          <div className="bg-gray-800 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-gray-400 mb-2 break-all">
              Stream URL:{' '}
              {camera.streamUri ?? 'Connect camera to load stream URL'}
            </p>
            {camera.snapshotUri && (
              <img
                src={camera.snapshotUri}
                alt="Camera Stream"
                className="mt-4 rounded-lg max-w-full h-auto"
              />
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
        <div className="flex flex-col items-center space-y-2">
          <div className="text-white text-sm font-medium mb-2 flex items-center gap-2">
            Camera Controls
            {isControlling && <Loader className="w-4 h-4 animate-spin" />}
          </div>

          <div className="grid grid-cols-3 gap-1">
            <div />
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); startMove('tilt', 'up'); }}
              className={ptzButtonClass}
              title="Tilt Up"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div />

            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); startMove('pan', 'left'); }}
              className={ptzButtonClass}
              title="Pan Left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => void sendPTZCommand('home')}
              className="w-10 h-10 bg-blue-700 hover:bg-blue-600 rounded-lg flex items-center justify-center text-white transition-colors"
              title="Home Position"
            >
              <Home className="w-4 h-4" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); startMove('pan', 'right'); }}
              className={ptzButtonClass}
              title="Pan Right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div />
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); startMove('tilt', 'down'); }}
              className={ptzButtonClass}
              title="Tilt Down"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            <div />
          </div>

          <div className="flex space-x-1 mt-2">
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); startMove('zoom', 'in'); }}
              className={ptzButtonClass}
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); startMove('zoom', 'out'); }}
              className={ptzButtonClass}
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void sendPTZCommand('stop')}
              className="w-10 h-10 bg-red-700 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-colors"
              title="Stop Movement"
            >
              <Square className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
