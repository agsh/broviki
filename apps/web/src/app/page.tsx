'use client';

import React, { useState, useEffect, useRef } from 'react';
import CameraList, { CameraConfig } from '../components/camera-list';
import RightPanel from '../components/right-panel';
import Resizer from '../components/resizer';

export default function Home() {
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<CameraConfig | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(33);
  const [videoHeight, setVideoHeight] = useState(67);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState<'horizontal' | 'vertical' | null>(null);
  const [isLoadingCameras, setIsLoadingCameras] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedSelectedCamera = localStorage.getItem('selectedCamera');
    const savedLeftPanelWidth = localStorage.getItem('leftPanelWidth');
    const savedVideoHeight = localStorage.getItem('videoHeight');

    if (savedLeftPanelWidth) {
      setLeftPanelWidth(parseInt(savedLeftPanelWidth, 10));
    }

    if (savedVideoHeight) {
      setVideoHeight(parseInt(savedVideoHeight, 10));
    }

    const loadCameras = async () => {
      try {
        const response = await fetch('/api/cameras');
        const raw = await response.text();
        let result: { success?: boolean; message?: string; cameras?: CameraConfig[] };
        try {
          result = JSON.parse(raw) as typeof result;
        } catch {
          throw new Error(
            response.ok
              ? 'Invalid API response'
              : `API unavailable (${response.status}): ${raw.slice(0, 120)}`,
          );
        }
        if (!result.success) {
          throw new Error(result.message || 'Failed to load cameras');
        }

        const loaded: CameraConfig[] = result.cameras ?? [];
        setCameras(loaded);

        if (savedSelectedCamera) {
          const selectedId = JSON.parse(savedSelectedCamera);
          const selected = loaded.find((cam) => cam.id === selectedId);
          if (selected) {
            setSelectedCamera(selected);
          }
        }
      } catch (error) {
        console.error('Failed to load cameras from API:', error);
      } finally {
        setIsLoadingCameras(false);
      }
    };

    void loadCameras();
  }, []);

  useEffect(() => {
    if (selectedCamera) {
      localStorage.setItem('selectedCamera', JSON.stringify(selectedCamera.id));
    } else {
      localStorage.removeItem('selectedCamera');
    }
  }, [selectedCamera]);

  useEffect(() => {
    localStorage.setItem('leftPanelWidth', leftPanelWidth.toString());
  }, [leftPanelWidth]);

  useEffect(() => {
    localStorage.setItem('videoHeight', videoHeight.toString());
  }, [videoHeight]);

  const handleAddCamera = async (camera: CameraConfig) => {
    try {
      const response = await fetch('/api/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to save camera');
      }

      const saved: CameraConfig = result.camera;
      setCameras((prev) => {
        if (prev.some((cam) => cam.id === saved.id)) {
          return prev.map((cam) => (cam.id === saved.id ? saved : cam));
        }
        return [...prev, saved];
      });
    } catch (error) {
      console.error('Failed to add camera:', error);
      alert('Failed to save camera');
    }
  };

  const handleDiscovery = async () => {
    try {
      const response = await fetch('/api/startup', { cache: 'no-store' });
      const data = await response.json();

      // Support both new `{ cameras }` and legacy bare-array responses
      const discovered: CameraConfig[] = Array.isArray(data)
        ? data
        : Array.isArray(data.cameras)
          ? data.cameras
          : [];

      if (!response.ok || (data.success === false && discovered.length === 0)) {
        throw new Error(data.message || 'Discovery request failed');
      }

      for (const cam of discovered) {
        if (!cam.hostname) continue;
        const port = cam.port ?? (cam.useSecure ? 443 : 80);
        await handleAddCamera({
          id: `${cam.hostname}:${port}`,
          hostname: cam.hostname,
          port,
          username: cam.username,
          password: cam.password,
          useSecure: cam.useSecure ?? false,
          useWSSecurity: cam.useWSSecurity ?? false,
          path: cam.path || '/onvif/device_service',
          name: cam.name || `${cam.hostname}:${port}`,
          status: 'disconnected',
        });
      }

      if (discovered.length === 0) {
        alert(
          data.message ||
            'No ONVIF cameras found. They must be on the same LAN/subnet as this machine.',
        );
      }
    } catch (error) {
      console.error('Startup error:', error);
      alert(error instanceof Error ? error.message : 'Discovery failed');
    }
  };

  const handleRemoveCamera = async (id: string) => {
    try {
      const response = await fetch(`/api/cameras/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete camera');
      }

      setCameras((prev) => prev.filter((camera) => camera.id !== id));
      if (selectedCamera?.id === id) {
        setSelectedCamera(null);
      }
    } catch (error) {
      console.error('Failed to remove camera:', error);
      alert('Failed to delete camera');
    }
  };

  const handleCameraSelect = (camera: CameraConfig) => {
    setSelectedCamera(camera);
  };

  const handleCameraUpdate = (updatedCamera: CameraConfig) => {
    setCameras((prev) =>
      prev.map((cam) => (cam.id === updatedCamera.id ? updatedCamera : cam)),
    );

    if (selectedCamera?.id === updatedCamera.id) {
      setSelectedCamera(updatedCamera);
    }
  };

  const handleHorizontalResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeType('horizontal');
  };

  const handleVerticalResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeType('vertical');
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !containerRef.current || !resizeType) return;

    const containerRect = containerRef.current.getBoundingClientRect();

    if (resizeType === 'horizontal') {
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      setLeftPanelWidth(Math.max(20, Math.min(80, newWidth)));
    } else if (resizeType === 'vertical') {
      const rightPanelRect = containerRef.current
        .querySelector('.right-panel')
        ?.getBoundingClientRect();
      if (rightPanelRect) {
        const newHeight = ((e.clientY - rightPanelRect.top) / rightPanelRect.height) * 100;
        setVideoHeight(Math.max(30, Math.min(90, newHeight)));
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    setResizeType(null);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, resizeType]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div
        ref={containerRef}
        className="flex h-screen"
        style={{
          cursor: isResizing
            ? resizeType === 'horizontal'
              ? 'ew-resize'
              : 'ns-resize'
            : 'default',
        }}
      >
        <CameraList
          cameras={cameras}
          selectedCamera={selectedCamera}
          onCameraSelect={handleCameraSelect}
          onCameraAdd={handleAddCamera}
          onCameraRemove={handleRemoveCamera}
          onDiscovery={handleDiscovery}
          width={leftPanelWidth}
        />

        <Resizer direction="horizontal" onMouseDown={handleHorizontalResize} />

        <RightPanel
          camera={selectedCamera}
          width={100 - leftPanelWidth}
          videoHeight={videoHeight}
          onVerticalResize={handleVerticalResize}
          onCameraUpdate={handleCameraUpdate}
        />
      </div>
      {isLoadingCameras ? (
        <div className="pointer-events-none fixed bottom-4 right-4 rounded bg-black/70 px-3 py-2 text-sm text-white">
          Loading cameras…
        </div>
      ) : null}
    </div>
  );
}
