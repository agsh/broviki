import VideoWindow from './video-window';
import CameraProperties from './camera-properties';
import Resizer from './resizer';
import { CameraConfig } from './camera-list';

interface RightPanelProps {
  camera: CameraConfig | null;
  width: number;
  videoHeight: number;
  onVerticalResize: (e: React.MouseEvent) => void;
  onCameraUpdate?: (camera: CameraConfig) => void;
}

export default function RightPanel({ 
  camera, 
  width, 
  videoHeight, 
  onVerticalResize,
  onCameraUpdate
}: RightPanelProps) {
  return (
    <div 
      className="right-panel flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      style={{ width: `${width}%` }}
    >
      {camera ? (
        <>
          <VideoWindow camera={camera} height={videoHeight} />
          <Resizer direction="vertical" onMouseDown={onVerticalResize} />
          <CameraProperties 
            camera={camera} 
            height={100 - videoHeight} 
            onCameraUpdate={onCameraUpdate}
          />
        </>
      ) : (
        <VideoWindow camera={null} height={100} />
      )}
    </div>
  );
} 