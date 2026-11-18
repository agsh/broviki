import { Injectable, Logger } from '@nestjs/common';
import { networkInterfaces } from 'node:os';
import { Discovery, type Onvif } from 'onvif';

export interface DiscoveredCamera {
  hostname: string;
  port: number;
  username?: string;
  password?: string;
  useSecure: boolean;
  useWSSecurity: boolean;
  path: string;
}

function isOnvif(cam: Onvif | Record<string, unknown>): cam is Onvif {
  return typeof (cam as Onvif).hostname === 'string' && typeof (cam as Onvif).connect === 'function';
}

function listProbeInterfaces(): string[] {
  const result: string[] = [];
  const ifaces = networkInterfaces();
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const addr of addrs ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        result.push(`${name} ${addr.address}`);
      }
    }
  }
  return result;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  async probe() {
    this.logger.log('WS-Discovery probe starting');
    const interfaces = listProbeInterfaces();
    const errors: string[] = [];

    const onError = (error: Error) => {
      const message = error?.message || String(error);
      errors.push(message);
      this.logger.warn(`WS-Discovery error: ${message}`);
    };

    Discovery.on('error', onError);

    try {
      // types: [] — match any WS-Discovery type (some cameras omit tds:Device)
      const result = await Discovery.probe({
        resolve: true,
        timeout: 8000,
        type: 'udp4',
        types: [],
      });

      const cameras: DiscoveredCamera[] = [];
      const seen = new Set<string>();

      for (const cam of result) {
        if (!isOnvif(cam) || !cam.hostname) continue;

        const port = cam.port ?? (cam.useSecure ? 443 : 80);
        const key = `${cam.hostname}:${port}`;
        if (seen.has(key)) continue;
        seen.add(key);

        cameras.push({
          hostname: cam.hostname,
          port,
          username: cam.username,
          password: cam.password,
          useSecure: Boolean(cam.useSecure),
          useWSSecurity: false,
          path: cam.path || '/onvif/device_service',
        });
      }

      this.logger.log(
        `WS-Discovery finished: ${cameras.length} camera(s) on interfaces [${interfaces.join(', ')}]`,
      );

      return {
        success: true,
        cameras,
        interfaces,
        message:
          cameras.length > 0
            ? `Found ${cameras.length} camera(s)`
            : `No ONVIF cameras answered WS-Discovery on: ${interfaces.join(', ') || 'no IPv4 interfaces'}. Cameras must be on the same L2/broadcast domain.`,
        errors: errors.slice(0, 10),
      };
    } finally {
      Discovery.off('error', onError);
    }
  }

  greet(name?: string) {
    return {
      message: `Привет, ${name ?? 'Гость'}!`,
    };
  }
}
