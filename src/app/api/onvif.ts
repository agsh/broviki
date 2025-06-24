import { CameraConfig } from "@/components/camera-list";
import { Onvif } from 'onvif/src';

const cameras = new Map();

export function list() {
    return cameras;
}

export async function add(camera: CameraConfig): Promise<Onvif> {
    // if (cameras.has(camera.id)) {
    //     return cameras.get(camera.id);
    // }
    console.log('Adding camera:', camera);
    const onvif = new Onvif(camera);
    onvif.on('rawResponse', console.log);
    await onvif.connect();
    cameras.set(camera.id, onvif);
    return onvif;
}