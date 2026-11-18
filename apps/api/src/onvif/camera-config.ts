export interface CameraConfig {
  id: string;
  name?: string;
  hostname: string;
  port?: number;
  username?: string;
  password?: string;
  path?: string;
  useSecure?: boolean;
  useWSSecurity?: boolean;
  status?: 'connected' | 'disconnected' | 'connecting';
  message?: string;
  snapshotUri?: string;
  streamUri?: string;
  profileToken?: string;
  capabilities?: unknown;
}
