import { CameraConfig } from '@/components/camera-list';
import { Onvif } from 'onvif/src/index.ts';

const cameras = new Map<string, Onvif>();

export function list() {
  return cameras;
}

export function resolvePtzProfileToken(onvif: Onvif): string {
  const profileWithPtz = onvif.media.profiles.find((p) => p.PTZConfiguration != null);
  if (profileWithPtz?.token) {
    return profileWithPtz.token;
  }

  const token = onvif.activeSource?.profileToken;
  if (!token) {
    throw new Error('Camera has no active profile. Connect the camera first.');
  }
  return token;
}

export async function add(camera: CameraConfig): Promise<Onvif> {
  console.log('Adding camera:', camera);
  const onvif = new Onvif(camera);
  await onvif.connect();
  onvif.on('rawResponse', (msg) => console.log(msg));

  if (!onvif.uri.PTZ) {
    console.warn(`Camera ${camera.id}: no PTZ service endpoint in device capabilities`);
  } else {
    const ptzProfileToken = resolvePtzProfileToken(onvif);
    console.log(`Camera ${camera.id}: PTZ profile token = ${ptzProfileToken}`);
  }

  cameras.set(camera.id, onvif);
  return onvif;
}
