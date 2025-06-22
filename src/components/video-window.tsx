import { Monitor } from 'lucide-react';
import { CameraConfig } from './camera-list';

interface VideoWindowProps {
  camera: CameraConfig | null;
  height: number;
}

export default function VideoWindow({ camera, height }: VideoWindowProps) {
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
  console.log('camera',camera);
  return (
    <div 
      className="bg-black flex items-center justify-center"
      style={{ height: `${height}%` }}
    >
      <div className="text-center text-white">
        <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <h3 className="text-xl font-medium mb-2">{camera.name || camera.hostname}</h3>
        <p className="text-gray-300 mb-4">Video stream would be displayed here</p>
        <div className="bg-gray-800 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-sm text-gray-400">
            Stream URL: {camera.useSecure ? 'https' : 'http'}://{camera.hostname}:{camera.port}{camera.path}
          </p>
          <img src={camera.snapshotUri} alt="Camera Stream" className="mt-4" />
        </div>
      </div>
    </div>
  );
} 