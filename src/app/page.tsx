'use client';

import React, { useState, useEffect, useRef } from 'react';
import CameraList, { CameraConfig } from '../components/camera-list';
import RightPanel from '../components/right-panel';
import Resizer from '../components/resizer';

export default function Home() {
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<CameraConfig | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(33); // percentage
  const [videoHeight, setVideoHeight] = useState(67); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState<'horizontal' | 'vertical' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load cameras from localStorage on component mount
  useEffect(() => {
    const savedCameras = localStorage.getItem('videoCameras');
    const savedSelectedCamera = localStorage.getItem('selectedCamera');
    const savedLeftPanelWidth = localStorage.getItem('leftPanelWidth');
    const savedVideoHeight = localStorage.getItem('videoHeight');

    if (savedCameras) {
      try {
        const parsedCameras = JSON.parse(savedCameras);
        setCameras(parsedCameras);

        if (savedSelectedCamera) {
          const selectedId = JSON.parse(savedSelectedCamera);
          const selected = parsedCameras.find((cam: CameraConfig) => cam.id === selectedId);
          if (selected) {
            setSelectedCamera(selected);
          }
        }
      } catch (error) {
        console.error('Failed to load cameras from localStorage:', error);
      }
    }

    if (savedLeftPanelWidth) {
      setLeftPanelWidth(parseInt(savedLeftPanelWidth, 10));
    }

    if (savedVideoHeight) {
      setVideoHeight(parseInt(savedVideoHeight, 10));
    }
  }, []);

  // Save cameras to localStorage whenever cameras change
  useEffect(() => {
    if (cameras.length > 0) {
      localStorage.setItem('videoCameras', JSON.stringify(cameras));
    } else {
      localStorage.removeItem('videoCameras');
    }
  }, [cameras]);

  // Save selected camera to localStorage
  useEffect(() => {
    if (selectedCamera) {
      localStorage.setItem('selectedCamera', JSON.stringify(selectedCamera.id));
    } else {
      localStorage.removeItem('selectedCamera');
    }
  }, [selectedCamera]);

  // Save layout preferences
  useEffect(() => {
    localStorage.setItem('leftPanelWidth', leftPanelWidth.toString());
  }, [leftPanelWidth]);

  useEffect(() => {
    localStorage.setItem('videoHeight', videoHeight.toString());
  }, [videoHeight]);

  useEffect(() => {
    console.log('Страница загружена (клиент)');
    fetch('/api/startup')
      .then((response) => response.json())
      .then((data) => {
        data.forEach((cam: CameraConfig) => {
          handleAddCamera({
            id: cam.hostname + ':' + cam.port,
            hostname: cam.hostname,
            port: cam.port,
            username: cam.username,
            password: cam.password,
            useSecure: cam.useSecure,
            useWSSecurity: cam.useWSSecurity,
            path: cam.path,
            name: cam.hostname + ':' + cam.port,
          });
        });
      })
      .catch((error) => {
        console.error('Startup error:', error);
      });
  }, []);

  const handleAddCamera = (camera: CameraConfig) => {
    setCameras((prev) => {
      if (prev.some((cam) => cam.id === camera.id)) {
        return prev;
      }
      return [...prev, camera]
    });
  };

  const handleRemoveCamera = (id: string) => {
    setCameras((prev) => prev.filter((camera) => camera.id !== id));
    if (selectedCamera?.id === id) {
      setSelectedCamera(null);
    }
  };

  const handleCameraSelect = (camera: CameraConfig) => {
    setSelectedCamera(camera);
  };

  // Resize handlers
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
      setLeftPanelWidth(Math.max(20, Math.min(80, newWidth))); // Limit between 20% and 80%
    } else if (resizeType === 'vertical') {
      const rightPanelRect = containerRef.current.querySelector('.right-panel')?.getBoundingClientRect();
      if (rightPanelRect) {
        const newHeight = ((e.clientY - rightPanelRect.top) / rightPanelRect.height) * 100;
        setVideoHeight(Math.max(30, Math.min(90, newHeight))); // Limit between 30% and 90%
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    setResizeType(null);
  };

  // Handle mouse events for resizing
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
        style={{ cursor: isResizing ? (resizeType === 'horizontal' ? 'ew-resize' : 'ns-resize') : 'default' }}
      >
        <CameraList
          cameras={cameras}
          selectedCamera={selectedCamera}
          onCameraSelect={handleCameraSelect}
          onCameraAdd={handleAddCamera}
          onCameraRemove={handleRemoveCamera}
          width={leftPanelWidth}
        />

        <Resizer direction="horizontal" onMouseDown={handleHorizontalResize} />

        <RightPanel
          camera={selectedCamera}
          width={100 - leftPanelWidth}
          videoHeight={videoHeight}
          onVerticalResize={handleVerticalResize}
        />
      </div>
    </div>
  );
}
