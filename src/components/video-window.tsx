'use client';

import { useState } from 'react';
import { Monitor, Home, ZoomIn, ZoomOut, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Square, Loader } from 'lucide-react';
import { CameraConfig } from './camera-list';

interface VideoWindowProps {
  camera: CameraConfig | null;
  height: number;
}

export default function VideoWindow({ camera, height }: VideoWindowProps) {
  const [isControlling, setIsControlling] = useState(false);

  const sendPTZCommand = async (command: string, direction?: string) => {
    if (!camera) return;
    
    setIsControlling(true);
    try {
      const response = await fetch('/api/cam/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cameraId: camera.id,
          command,
          direction,
          speed: 1
        }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('PTZ command failed:', result.message);
      }
    } catch (error) {
      console.error('Error sending PTZ command:', error);
    } finally {
      setIsControlling(false);
    }
  };

  const handleMouseDown = (command: string, direction?: string) => {
    sendPTZCommand(command, direction);
  };

  const handleMouseUp = () => {
    sendPTZCommand('stop');
  };

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
      {/* Video Content Area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-white">
          <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium mb-2">{camera.name || camera.hostname}</h3>
          <p className="text-gray-300 mb-4">Video stream would be displayed here</p>
          <div className="bg-gray-800 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-gray-400 mb-2">
              Stream URL: {camera.useSecure ? 'https' : 'http'}://{camera.hostname}:{camera.port}{camera.path}
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

      {/* PTZ Controls Overlay */}
      <div className="absolute bottom-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
        <div className="flex flex-col items-center space-y-2">
          {/* Title */}
          <div className="text-white text-sm font-medium mb-2">Camera Controls</div>
          
          {/* Pan/Tilt Controls */}
          <div className="grid grid-cols-3 gap-1">
            {/* Top Row */}
            <div>
              {/* Status Indicator */}
          {isControlling && (
            <div className="text-xs text-gray-400 mt-2">
              <Loader />
            </div>
          )}
            </div>
            <button
              onMouseDown={() => handleMouseDown('tilt', 'up')}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              disabled={isControlling}
              className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors disabled:opacity-50"
              title="Tilt Up"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div></div>
            
            {/* Middle Row */}
            <button
              onMouseDown={() => handleMouseDown('pan', 'left')}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              disabled={isControlling}
              className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors disabled:opacity-50"
              title="Pan Left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => sendPTZCommand('home')}
              disabled={isControlling}
              className="w-10 h-10 bg-blue-700 hover:bg-blue-600 rounded-lg flex items-center justify-center text-white transition-colors disabled:opacity-50"
              title="Home Position"
            >
              <Home className="w-4 h-4" />
            </button>
            <button
              onMouseDown={() => handleMouseDown('pan', 'right')}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              disabled={isControlling}
              className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors disabled:opacity-50"
              title="Pan Right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            {/* Bottom Row */}
            <div></div>
            <button
              onMouseDown={() => handleMouseDown('tilt', 'down')}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              disabled={isControlling}
              className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors disabled:opacity-50"
              title="Tilt Down"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            <div></div>
          </div>

          {/* Zoom Controls */}
          <div className="flex space-x-1 mt-2">
            <button
              onMouseDown={() => handleMouseDown('zoom', 'in')}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              disabled={isControlling}
              className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors disabled:opacity-50"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onMouseDown={() => handleMouseDown('zoom', 'out')}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              disabled={isControlling}
              className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors disabled:opacity-50"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => sendPTZCommand('stop')}
              disabled={isControlling}
              className="w-10 h-10 bg-red-700 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-colors disabled:opacity-50"
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