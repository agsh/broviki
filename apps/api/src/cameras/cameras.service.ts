import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { Camera } from '../generated/prisma/client';
import { Onvif, getDigestHeaders } from 'onvif';
import { MediaMtxService } from '../mediamtx/mediamtx.service';
import { PrismaService } from '../prisma/prisma.service';
import { OnvifService } from '../onvif/onvif.service';
import type {
  CameraBodyDto,
  CamRequestDto,
  ControlDirection,
  ControlRequestDto,
} from './dto/cam.dto';
import {
  collectDeviceInfo,
  type CameraDeviceInfo,
} from './device-info.util';
import {
  parseProfilesJson,
  summarizeProfile,
  type MediaProfileSummary,
  type OnvifProfileLike,
} from './profile.util';

export type CameraResponse = CameraBodyDto & {
  status: 'connected' | 'disconnected' | 'connecting';
  message?: string;
  profileToken?: string;
  profiles?: MediaProfileSummary[];
};

function mediaUriString(
  result: { uri?: string; mediaUri?: { uri?: string } } | undefined,
): string {
  if (!result) return '';
  return result.uri ?? result.mediaUri?.uri ?? '';
}

function toCameraResponse(
  camera: Camera,
  status: CameraResponse['status'] = 'disconnected',
): CameraResponse {
  return {
    id: camera.id,
    name: camera.name ?? undefined,
    hostname: camera.hostname,
    port: camera.port,
    username: camera.username ?? undefined,
    password: camera.password ?? undefined,
    path: camera.path,
    useSecure: camera.useSecure,
    useWSSecurity: camera.useWSSecurity,
    snapshotUri: camera.snapshotUri ?? undefined,
    streamUri: camera.streamUri ?? undefined,
    profileToken: camera.profileToken ?? undefined,
    profiles: parseProfilesJson(camera.profilesJson),
    status,
  };
}

function cameraData(input: CameraBodyDto) {
  return {
    id: input.id,
    name: input.name ?? null,
    hostname: input.hostname,
    port: input.port,
    username: input.username ?? null,
    password: input.password ?? null,
    path: input.path || '/onvif/device_service',
    useSecure: input.useSecure ?? false,
    useWSSecurity: input.useWSSecurity ?? false,
    snapshotUri: input.snapshotUri ?? null,
    streamUri: input.streamUri ?? null,
    ...(input.profileToken !== undefined
      ? { profileToken: input.profileToken || null }
      : {}),
    ...(input.profiles !== undefined
      ? { profilesJson: input.profiles ? JSON.stringify(input.profiles) : null }
      : {}),
  };
}

function listProfileSummaries(onvif: Onvif): MediaProfileSummary[] {
  const profiles = (
    Array.isArray(onvif.profiles) && onvif.profiles.length
      ? onvif.profiles
      : Array.isArray(onvif.media.profiles)
        ? onvif.media.profiles
        : []
  ) as OnvifProfileLike[];
  return profiles.map(summarizeProfile);
}

/**
 * Embed username/password into an RTSP URL for MediaMTX.
 * Skips when userinfo already present, credentials empty, or non-standard RTSP ports
 * (e.g. local rtspserver demos on :5554 that reject userinfo).
 */
function withRtspUserinfo(
  rtspUrl: string,
  username?: string | null,
  password?: string | null,
): string {
  if (!username) return rtspUrl;
  if (/^rtsps?:\/\/[^/@]+@/i.test(rtspUrl)) return rtspUrl;

  try {
    const parsed = new URL(rtspUrl);
    const port =
      parsed.port ||
      (parsed.protocol === 'rtsps:' ? '322' : '554');
    if (port !== '554' && port !== '8554' && port !== '322') {
      return rtspUrl;
    }
  } catch {
    // fall through and inject
  }

  const user = encodeURIComponent(username);
  const pass = encodeURIComponent(password ?? '');
  return rtspUrl.replace(/^(rtsps?:\/\/)/i, `$1${user}:${pass}@`);
}

async function fetchUrisViaMedia2(onvif: Onvif, profileToken?: string) {
  let snapshotUri = '';
  let streamUri = '';
  if (!onvif.uri.media2 && !onvif.media2Support) {
    return { snapshotUri, streamUri };
  }

  try {
    const uri = await onvif.media2.getSnapshotUri(
      profileToken ? { profileToken } : undefined,
    );
    snapshotUri = typeof uri === 'string' ? uri : mediaUriString(uri);
  } catch {
    // snapshot optional
  }

  try {
    const uri = await onvif.media2.getStreamUri({
      protocol: 'RtspUnicast',
      ...(profileToken ? { profileToken } : {}),
    });
    streamUri = typeof uri === 'string' ? uri : mediaUriString(uri);
  } catch {
    // stream optional
  }

  return { snapshotUri, streamUri };
}

async function fetchUrisForProfile(onvif: Onvif, profileToken?: string) {
  let snapshotUri = '';
  let streamUri = '';
  const opts = profileToken ? { profileToken } : undefined;

  try {
    snapshotUri = mediaUriString(await onvif.media.getSnapshotUri(opts));
  } catch {
    // snapshot not supported
  }

  try {
    streamUri = mediaUriString(await onvif.media.getStreamUri(opts));
  } catch {
    // stream uri not available
  }

  if (!snapshotUri || !streamUri) {
    const viaMedia2 = await fetchUrisViaMedia2(onvif, profileToken);
    snapshotUri = snapshotUri || viaMedia2.snapshotUri;
    streamUri = streamUri || viaMedia2.streamUri;
  }

  return { snapshotUri, streamUri };
}

function headersToRaw(headers: Headers): string[] {
  const raw: string[] = [];
  headers.forEach((value, key) => {
    raw.push(key, value);
  });
  return raw;
}

async function httpGet(
  url: URL,
  headers: Record<string, string> = {},
): Promise<{ statusCode: number; rawHeaders: string[]; body: Buffer; contentType: string }> {
  const res = await fetch(url, { method: 'GET', headers, redirect: 'follow' });
  return {
    statusCode: res.status,
    rawHeaders: headersToRaw(res.headers),
    body: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get('content-type') || 'application/octet-stream',
  };
}

/**
 * Download JPEG/image from ONVIF GetSnapshotUri (anonymous → Digest → Basic).
 * Mirrors onvif examples/media.snapshot.ts.
 */
async function downloadSnapshotImage(
  onvif: Onvif,
  snapshotUri: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  let url: URL;
  try {
    url = onvif.parseUrl(snapshotUri);
  } catch {
    try {
      url = new URL(snapshotUri);
    } catch {
      return null;
    }
  }

  const path = `${url.pathname}${url.search}`;
  let response = await httpGet(url);

  if (response.statusCode === 401) {
    const challenges = getDigestHeaders(response.rawHeaders);
    if (challenges.length > 0) {
      const authorization = onvif.digestAuth(challenges, { method: 'GET', path });
      response = await httpGet(url, { authorization });
    } else if (onvif.username) {
      const basic = Buffer.from(`${onvif.username}:${onvif.password ?? ''}`).toString('base64');
      response = await httpGet(url, { authorization: `Basic ${basic}` });
    }
  }

  if (response.statusCode < 200 || response.statusCode >= 300 || response.body.length === 0) {
    return null;
  }

  const contentType = response.contentType.includes('image')
    ? response.contentType
    : 'image/jpeg';

  return { buffer: response.body, contentType };
}

@Injectable()
export class CamerasService implements OnModuleInit {
  private readonly logger = new Logger(CamerasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly onvifService: OnvifService,
    private readonly mediaMtx: MediaMtxService,
  ) {}

  async onModuleInit() {
    // MediaMTX drops API-added paths when its config file reloads — re-sync from DB.
    await this.syncMediaMtxPaths();
  }

  async syncMediaMtxPaths() {
    const cameras = await this.prisma.camera.findMany();
    for (const camera of cameras) {
      const rtsp = this.resolveRtspSource(camera);
      if (!rtsp) continue;
      try {
        await this.mediaMtx.ensureOnDemandPath(camera.id, rtsp);
      } catch (error) {
        this.logger.warn(
          `MediaMTX sync failed for ${camera.id}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }

  async listCameras() {
    const cameras = await this.prisma.camera.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      cameras: cameras.map((camera) =>
        toCameraResponse(
          camera,
          this.onvifService.isConnected(camera.id) ? 'connected' : 'disconnected',
        ),
      ),
    };
  }

  async createCamera(input: CameraBodyDto) {
    const camera = await this.prisma.camera.upsert({
      where: { id: input.id },
      create: cameraData(input),
      update: cameraData(input),
    });

    return {
      success: true,
      message: 'Camera saved successfully',
      camera: toCameraResponse(camera),
    };
  }

  async updateCamera(input: CameraBodyDto) {
    const existing = await this.prisma.camera.findUnique({ where: { id: input.id } });
    if (!existing) {
      throw new NotFoundException({
        success: false,
        message: `Camera ${input.id} not found`,
      });
    }

    const camera = await this.prisma.camera.update({
      where: { id: input.id },
      data: cameraData(input),
    });

    return {
      success: true,
      message: 'Camera updated successfully',
      camera: toCameraResponse(camera),
    };
  }

  async deleteCamera(id: string) {
    const existing = await this.prisma.camera.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        success: false,
        message: `Camera ${id} not found`,
      });
    }

    await this.prisma.camera.delete({ where: { id } });
    await this.onvifService.remove(id);
    try {
      await this.mediaMtx.removePath(id);
    } catch (error) {
      console.warn('Failed to remove MediaMTX path:', error);
    }

    return {
      success: true,
      message: 'Camera deleted successfully',
    };
  }

  /**
   * Registers an on-demand MediaMTX path for the camera RTSP URI and returns HLS/MSE URL.
   */
  async getPlayback(cameraId: string, requestHost?: string) {
    const camera = await this.prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) {
      throw new NotFoundException({
        success: false,
        message: `Camera ${cameraId} not found`,
      });
    }

    const rtspSource = this.resolveRtspSource(camera);
    if (!rtspSource) {
      return {
        success: false,
        message:
          'No RTSP stream URI. Connect the camera first (ONVIF getStreamUri) or set streamUri.',
      };
    }

    const playback = await this.mediaMtx.ensureOnDemandPath(
      camera.id,
      rtspSource,
      requestHost,
    );
    return {
      success: true,
      message: 'Playback ready (WebRTC WHEP, on-demand)',
      ...playback,
    };
  }

  /**
   * Proxy ONVIF snapshot JPEG for UI thumbnails.
   * Returns null when the camera has no snapshot URI or download fails.
   */
  async getSnapshot(
    cameraId: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const camera = await this.prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) {
      throw new NotFoundException({
        success: false,
        message: `Camera ${cameraId} not found`,
      });
    }

    let snapshotUri = camera.snapshotUri?.trim() || '';
    let onvif = this.onvifService.get(cameraId);

    if (onvif) {
      try {
        const fresh = await fetchUrisForProfile(
          onvif,
          camera.profileToken ?? onvif.activeMediaProfile?.profileToken,
        );
        if (fresh.snapshotUri) {
          snapshotUri = fresh.snapshotUri;
          if (fresh.snapshotUri !== camera.snapshotUri) {
            await this.prisma.camera.update({
              where: { id: cameraId },
              data: { snapshotUri: fresh.snapshotUri },
            });
          }
        }
      } catch {
        // keep stored URI
      }
    }

    if (!snapshotUri) {
      return null;
    }

    if (!onvif) {
      onvif = new Onvif({
        hostname: camera.hostname,
        port: camera.port,
        username: camera.username ?? undefined,
        password: camera.password ?? undefined,
        path: camera.path,
        useSecure: camera.useSecure,
        useWSSecurity: camera.useWSSecurity,
      });
    }

    try {
      return await downloadSnapshotImage(onvif, snapshotUri);
    } catch (error) {
      this.logger.warn(
        `Snapshot download failed for ${cameraId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return null;
    }
  }

  private resolveRtspSource(camera: Camera): string | null {
    const streamUri = camera.streamUri?.trim();
    if (!streamUri?.startsWith('rtsp')) {
      return null;
    }

    // Keep streamUri clean in DB for display; inject credentials only for MediaMTX pull.
    return withRtspUserinfo(
      streamUri.replace(/&amp;/gi, '&'),
      camera.username,
      camera.password,
    );
  }

  async handleCamAction(body: CamRequestDto) {
    if (body.action === 'connect') {
      const existing = await this.prisma.camera.findUnique({ where: { id: body.id } });
      const onvif = await this.onvifService.add(body);

      const profiles = listProfileSummaries(onvif);
      const requestedToken =
        body.profileToken ||
        existing?.profileToken ||
        onvif.activeMediaProfile?.profileToken ||
        onvif.defaultProfile?.token ||
        profiles[0]?.token;

      if (requestedToken) {
        try {
          await onvif.setActiveMediaProfile(requestedToken);
        } catch (error) {
          this.logger.warn(
            `setActiveMediaProfile(${requestedToken}) failed: ${
              error instanceof Error ? error.message : error
            }`,
          );
        }
      }

      const profileToken =
        onvif.activeMediaProfile?.profileToken ||
        onvif.defaultProfile?.token ||
        requestedToken ||
        null;

      const { snapshotUri, streamUri } = await fetchUrisForProfile(
        onvif,
        profileToken ?? undefined,
      );
      const capabilities = onvif.defaultProfile;
      let deviceInfo: CameraDeviceInfo | undefined;
      try {
        deviceInfo = await collectDeviceInfo(onvif);
      } catch (error) {
        this.logger.warn(
          `Device info collection failed: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }

      const camera = await this.prisma.camera.upsert({
        where: { id: body.id },
        create: cameraData({
          ...body,
          snapshotUri,
          streamUri,
          profileToken: profileToken ?? undefined,
          profiles,
        }),
        update: {
          snapshotUri: snapshotUri || null,
          streamUri: streamUri || null,
          profileToken,
          profilesJson: JSON.stringify(profiles),
          name: body.name ?? undefined,
          username: body.username ?? null,
          password: body.password ?? null,
          path: body.path,
          useSecure: body.useSecure,
          useWSSecurity: body.useWSSecurity,
        },
      });

      const rtspSource = this.resolveRtspSource(camera);
      if (rtspSource) {
        try {
          await this.mediaMtx.ensureOnDemandPath(body.id, rtspSource);
        } catch (error) {
          this.logger.warn(
            `MediaMTX register failed: ${error instanceof Error ? error.message : error}`,
          );
        }
      }

      return {
        success: true,
        message: 'Connected successfully',
        status: 'connected' as const,
        capabilities,
        deviceInfo,
        snapshotUri,
        streamUri,
        profileToken,
        profiles,
      };
    }

    if (body.action === 'disconnect') {
      return this.disconnect(body.id);
    }

    if (body.action === 'selectProfile') {
      return this.selectProfile(body.id, body.profileToken);
    }

    if (body.action === 'refresh') {
      const connected = this.onvifService.isConnected(body.id);
      let deviceInfo: CameraDeviceInfo | undefined;
      const onvif = this.onvifService.get(body.id);
      if (onvif) {
        try {
          deviceInfo = await collectDeviceInfo(onvif);
        } catch (error) {
          this.logger.warn(
            `Device info refresh failed: ${
              error instanceof Error ? error.message : error
            }`,
          );
        }
      }
      return {
        success: true,
        message: connected ? 'ONVIF session is active' : 'ONVIF session is closed',
        status: (connected ? 'connected' : 'disconnected') as 'connected' | 'disconnected',
        lastRefresh: new Date().toISOString(),
        deviceInfo,
      };
    }

    return { success: false, message: 'Unknown action' };
  }

  async disconnect(cameraId: string) {
    const camera = await this.prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) {
      throw new NotFoundException({
        success: false,
        message: `Camera ${cameraId} not found`,
      });
    }

    const wasConnected = this.onvifService.isConnected(cameraId);
    await this.onvifService.remove(cameraId);

    return {
      success: true,
      message: wasConnected ? 'Disconnected (onvif.close)' : 'Already disconnected',
      status: 'disconnected' as const,
      camera: toCameraResponse(camera, 'disconnected'),
    };
  }

  getCameraEvents(cameraId: string, afterSeq = 0) {
    return {
      success: true as const,
      ...this.onvifService.getEvents(cameraId, afterSeq),
    };
  }

  clearCameraEvents(cameraId: string) {
    this.onvifService.clearEvents(cameraId);
    return {
      success: true as const,
      message: 'Event buffer cleared',
      ...this.onvifService.getEvents(cameraId),
    };
  }

  async selectProfile(cameraId: string, profileToken?: string) {
    if (!profileToken) {
      return { success: false, message: 'profileToken is required' };
    }

    // Never auto-connect — ONVIF session exists only after explicit Connect.
    const onvif = this.onvifService.get(cameraId);
    if (!onvif) {
      return {
        success: false,
        message: 'Camera is not connected. Press Connect first, then select a profile.',
      };
    }

    await onvif.setActiveMediaProfile(profileToken);
    const profiles = listProfileSummaries(onvif);
    const activeToken =
      onvif.activeMediaProfile?.profileToken || profileToken;
    const { snapshotUri, streamUri } = await fetchUrisForProfile(onvif, activeToken);

    const updated = await this.prisma.camera.update({
      where: { id: cameraId },
      data: {
        profileToken: activeToken,
        profilesJson: JSON.stringify(profiles),
        snapshotUri: snapshotUri || null,
        streamUri: streamUri || null,
      },
    });

    const rtspSource = this.resolveRtspSource(updated);
    if (rtspSource) {
      try {
        await this.mediaMtx.ensureOnDemandPath(cameraId, rtspSource);
      } catch (error) {
        this.logger.warn(
          `MediaMTX update failed: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    return {
      success: true,
      message: `Profile ${activeToken} selected`,
      status: 'connected' as const,
      profileToken: activeToken,
      profiles,
      snapshotUri,
      streamUri,
      capabilities: onvif.defaultProfile,
      camera: toCameraResponse(updated),
    };
  }

  async handleControl(body: ControlRequestDto) {
    const { cameraId, command, direction, speed = 0.3 } = body;

    if (!cameraId) {
      return { status: 400 as const, body: { success: false, message: 'cameraId is required' } };
    }

    const onvif = this.onvifService.get(cameraId);
    if (!onvif) {
      return {
        status: 404 as const,
        body: {
          success: false,
          message: 'Camera not found or not connected. Use Connect in camera properties first.',
        },
      };
    }

    switch (command) {
      case 'pan':
      case 'tilt': {
        const profileToken = this.assertPtzReady(onvif);
        // Pan/tilt only — omit Zoom so cameras don't ignore ContinuousMove.
        await onvif.ptz.continuousMove({
          profileToken,
          velocity: this.buildPanTiltVelocity(command, direction, speed),
          timeout: 'PT60S',
        });
        break;
      }

      case 'zoom': {
        const profileToken = this.assertPtzReady(onvif);
        await this.moveZoom(onvif, profileToken, direction, speed);
        break;
      }

      case 'home': {
        const profileToken = this.assertPtzReady(onvif);
        await this.gotoHomeWithFallback(onvif, profileToken);
        break;
      }

      case 'stop': {
        const profileToken =
          onvif.activeMediaProfile?.profileToken ??
          onvif.activeSource?.profileToken ??
          this.onvifService.resolvePtzProfileToken(onvif);
        await onvif.ptz.stop({ profileToken, panTilt: true, zoom: true });
        break;
      }

      default:
        return { status: 400 as const, body: { success: false, message: 'Invalid command' } };
    }

    return {
      status: 200 as const,
      body: { success: true, message: `${command} command executed successfully` },
    };
  }

  private assertPtzReady(onvif: Onvif): string {
    // onvif uses lowercase service keys: uri.ptz (not uri.PTZ)
    if (!onvif.uri.ptz) {
      throw new Error('Camera does not expose a PTZ service endpoint.');
    }

    const profileToken = this.onvifService.resolvePtzProfileToken(onvif);
    const profiles = Array.isArray(onvif.profiles) ? onvif.profiles : [];
    const profile = profiles.find((p) => p.token === profileToken);
    if (profile && !profile.PTZConfiguration) {
      throw new Error('No media profile with PTZ configuration found.');
    }

    return profileToken;
  }

  /** Continuous pan/tilt vector without Zoom element. */
  private buildPanTiltVelocity(
    command: 'pan' | 'tilt',
    direction: ControlDirection | undefined,
    speed: number,
  ) {
    const v = Math.min(1, Math.max(0.05, speed || 0.3));
    if (command === 'pan') {
      if (direction === 'left') return { panTilt: { x: -v, y: 0 } };
      if (direction === 'right') return { panTilt: { x: v, y: 0 } };
      throw new Error(`Invalid pan direction: ${direction ?? 'missing'}`);
    }
    if (direction === 'up') return { panTilt: { x: 0, y: v } };
    if (direction === 'down') return { panTilt: { x: 0, y: -v } };
    throw new Error(`Invalid tilt direction: ${direction ?? 'missing'}`);
  }

  /** Read PTZ node spaces. Empty spaces → capability unknown (try moves anyway). */
  private async getPtzNodeSpaces(onvif: Onvif): Promise<{
    homeSupported: boolean;
    spaces: Record<string, unknown>;
  }> {
    try {
      const nodes = await onvif.ptz.getNodes();
      const node = Array.isArray(nodes) ? nodes[0] : undefined;
      const raw = node?.supportedPTZSpaces;
      const spaces: Record<string, unknown> =
        raw && typeof raw === 'object' ? { ...(raw as object) } : {};
      return {
        // If getNodes works but homeSupported is missing, treat as unsupported.
        homeSupported: Boolean(node?.homeSupported),
        spaces,
      };
    } catch (error) {
      this.logger.warn(
        `getNodes failed: ${error instanceof Error ? error.message : error}`,
      );
      return { homeSupported: true, spaces: {} };
    }
  }

  private hasZoomSpace(spaces: Record<string, unknown>): boolean {
    const keys = [
      'relativeZoomTranslationSpace',
      'continuousZoomVelocitySpace',
      'absoluteZoomPositionSpace',
      'zoomSpeedSpace',
    ] as const;
    return keys.some((key) => {
      const value = spaces[key];
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    });
  }

  /**
   * Zoom via RelativeMove (click-friendly). Falls back to a short ContinuousMove
   * zoom-only velocity (no PanTilt) when RelativeMove is unsupported.
   */
  private async moveZoom(
    onvif: Onvif,
    profileToken: string,
    direction: ControlDirection | undefined,
    speed: number,
  ) {
    const step = Math.min(1, Math.max(0.05, speed || 0.3));
    const zoom =
      direction === 'in' ? step : direction === 'out' ? -step : Number.NaN;
    if (!Number.isFinite(zoom)) {
      throw new Error(`Invalid zoom direction: ${direction ?? 'missing'}`);
    }

    const { spaces } = await this.getPtzNodeSpaces(onvif);
    if (Object.keys(spaces).length > 0 && !this.hasZoomSpace(spaces)) {
      throw new Error(
        'This camera’s ONVIF PTZ profile has no zoom spaces (pan/tilt only). Digital zoom in the vendor app is not exposed via ONVIF.',
      );
    }

    const hasRelative = Array.isArray(spaces.relativeZoomTranslationSpace)
      ? spaces.relativeZoomTranslationSpace.length > 0
      : Boolean(spaces.relativeZoomTranslationSpace);
    const hasContinuous = Array.isArray(spaces.continuousZoomVelocitySpace)
      ? spaces.continuousZoomVelocitySpace.length > 0
      : Boolean(spaces.continuousZoomVelocitySpace);

    // Prefer RelativeMove when advertised; otherwise ContinuousMove with short timeout.
    if (hasRelative || Object.keys(spaces).length === 0) {
      try {
        await onvif.ptz.relativeMove({
          profileToken,
          // Flat vector → library emits both PanTilt(0,0) and Zoom; some cams need Zoom-only.
          translation: { x: 0, y: 0, zoom },
        });
        return;
      } catch (relativeError) {
        this.logger.warn(
          `RelativeMove zoom failed, trying ContinuousMove: ${
            relativeError instanceof Error ? relativeError.message : relativeError
          }`,
        );
      }
    }

    if (!hasContinuous && Object.keys(spaces).length > 0 && !hasRelative) {
      throw new Error('Camera does not advertise continuous or relative zoom.');
    }

    await onvif.ptz.continuousMove({
      profileToken,
      velocity: { x: 0, y: 0, zoom },
      timeout: 'PT0.5S',
    });
  }

  /**
   * GotoHomePosition is optional (Tapo etc. → homeSupported=false / HTTP 500).
   * Prefer AbsoluteMove pan/tilt center; then first preset.
   */
  private async gotoHomeWithFallback(onvif: Onvif, profileToken: string) {
    const { homeSupported } = await this.getPtzNodeSpaces(onvif);

    if (homeSupported) {
      try {
        await onvif.ptz.gotoHomePosition({ profileToken });
        return;
      } catch (homeError) {
        this.logger.warn(
          `GotoHomePosition failed: ${
            homeError instanceof Error ? homeError.message : homeError
          }`,
        );
      }
    } else {
      this.logger.warn('PTZ node reports homeSupported=false; skipping GotoHomePosition');
    }

    // Pan/tilt only — including Zoom in AbsoluteMove breaks cameras without zoom spaces.
    try {
      await onvif.ptz.absoluteMove({
        profileToken,
        position: { panTilt: { x: 0, y: 0 } },
      });
      return;
    } catch (absoluteError) {
      this.logger.warn(
        `AbsoluteMove home failed: ${
          absoluteError instanceof Error ? absoluteError.message : absoluteError
        }`,
      );
    }

    try {
      await onvif.ptz.absoluteMove({
        profileToken,
        position: { x: 0, y: 0 },
      });
      return;
    } catch (flatError) {
      this.logger.warn(
        `AbsoluteMove flat home failed: ${
          flatError instanceof Error ? flatError.message : flatError
        }`,
      );
    }

    const presets = await onvif.ptz.getPresets({ profileToken }).catch(() => []);
    const first = Array.isArray(presets) ? presets[0] : undefined;
    const presetToken = first?.token;
    if (!presetToken) {
      throw new Error(
        'Home is not supported on this camera (no GotoHomePosition / AbsoluteMove / presets).',
      );
    }
    await onvif.ptz.gotoPreset({ profileToken, presetToken });
  }
}
