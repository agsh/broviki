export type CamAction = 'connect' | 'disconnect' | 'refresh' | 'selectProfile';

export class CamRequestDto {
  id!: string;
  name?: string;
  hostname!: string;
  port!: number;
  username?: string;
  password?: string;
  path!: string;
  useSecure!: boolean;
  useWSSecurity!: boolean;
  action!: CamAction;
  status?: 'connected' | 'disconnected' | 'connecting';
  message?: string;
  capabilities?: unknown;
  snapshotUri?: string;
  streamUri?: string;
  /** Active / requested ONVIF media profile token */
  profileToken?: string;
}

export type ControlCommand = 'pan' | 'tilt' | 'zoom' | 'home' | 'stop';
export type ControlDirection = 'left' | 'right' | 'up' | 'down' | 'in' | 'out';

export class ControlRequestDto {
  cameraId!: string;
  command!: ControlCommand;
  direction?: ControlDirection;
  speed?: number;
}

export class CameraBodyDto {
  id!: string;
  name?: string;
  hostname!: string;
  port!: number;
  username?: string;
  password?: string;
  path!: string;
  useSecure!: boolean;
  useWSSecurity!: boolean;
  snapshotUri?: string;
  streamUri?: string;
  profileToken?: string;
  profiles?: Array<{
    token: string;
    name: string;
    encoding?: string;
    width?: number;
    height?: number;
    frameRate?: number;
    bitrate?: number;
    hasVideo?: boolean;
    hasPtz?: boolean;
    hasAudio?: boolean;
  }>;
}

export class CreateCameraDto {
  camera!: CameraBodyDto;
}

export class UpdateCameraDto {
  camera!: CameraBodyDto;
}
