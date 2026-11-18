import { Injectable, Logger } from '@nestjs/common';

export interface PlaybackInfo {
  pathName: string;
  /** @deprecated Prefer whepUrl — kept for MSE backup restore */
  hlsUrl: string;
  whepUrl: string;
  webrtc: true;
  mse: true;
  sourceOnDemand: true;
  source: string;
}

@Injectable()
export class MediaMtxService {
  private readonly logger = new Logger(MediaMtxService.name);
  private readonly apiBase =
    process.env.MEDIAMTX_API_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:9997';
  private readonly hlsPort = Number(process.env.MEDIAMTX_HLS_PORT ?? 8888);
  private readonly webrtcPort = Number(process.env.MEDIAMTX_WEBRTC_PORT ?? 8889);

  /** MediaMTX path names cannot contain `:`; map camera id → safe slug. */
  pathNameForCamera(cameraId: string): string {
    return `cam_${cameraId.replace(/[^a-zA-Z0-9._-]+/g, '_')}`;
  }

  private playbackHost(requestHost?: string): string {
    return (requestHost ?? '127.0.0.1').split(':')[0] || '127.0.0.1';
  }

  hlsUrlForPath(pathName: string, requestHost?: string): string {
    return `http://${this.playbackHost(requestHost)}:${this.hlsPort}/${pathName}/index.m3u8`;
  }

  whepUrlForPath(pathName: string, requestHost?: string): string {
    return `http://${this.playbackHost(requestHost)}:${this.webrtcPort}/${pathName}/whep`;
  }

  async ensureOnDemandPath(
    cameraId: string,
    rtspSource: string,
    requestHost?: string,
  ): Promise<PlaybackInfo> {
    const pathName = this.pathNameForCamera(cameraId);
    const body = {
      source: rtspSource,
      sourceOnDemand: true,
      sourceOnDemandStartTimeout: '20s',
      sourceOnDemandCloseAfter: '30s',
      // Many IP cameras (incl. TP-Link) are more reliable over TCP RTSP.
      rtspTransport: 'tcp',
    };

    const existing = await this.getPathConfig(pathName);
    if (!existing) {
      await this.request('POST', `/v3/config/paths/add/${encodeURIComponent(pathName)}`, body);
      this.logger.log(
        `MediaMTX path ready: ${pathName} → ${this.redactRtsp(rtspSource)}`,
      );
    } else if (!this.isSameRtspSource(existing.source, rtspSource)) {
      // PATCH restarts the path and drops active WHEP viewers — only when source changed.
      await this.request('PATCH', `/v3/config/paths/patch/${encodeURIComponent(pathName)}`, body);
      this.logger.log(
        `MediaMTX path updated: ${pathName} → ${this.redactRtsp(rtspSource)}`,
      );
    }

    return {
      pathName,
      hlsUrl: this.hlsUrlForPath(pathName, requestHost),
      whepUrl: this.whepUrlForPath(pathName, requestHost),
      webrtc: true,
      mse: true,
      sourceOnDemand: true,
      // Do not leak RTSP credentials to the browser/API clients.
      source: this.redactRtsp(rtspSource),
    };
  }

  private redactRtsp(rtspSource: string): string {
    return rtspSource.replace(/^(rtsps?:\/\/)([^/@]+)@/i, '$1***:***@');
  }

  /** Compare RTSP URLs ignoring cosmetic differences that don't need a path restart. */
  private isSameRtspSource(existing: unknown, next: string): boolean {
    if (typeof existing !== 'string' || !existing) return false;
    const normalize = (uri: string) =>
      uri.trim().replace(/&amp;/gi, '&').replace(/\/+$/, '');
    return normalize(existing) === normalize(next);
  }

  async removePath(cameraId: string): Promise<void> {
    const pathName = this.pathNameForCamera(cameraId);
    const existing = await this.getPathConfig(pathName);
    if (!existing) return;

    await this.request('DELETE', `/v3/config/paths/delete/${encodeURIComponent(pathName)}`);
    this.logger.log(`MediaMTX path removed: ${pathName}`);
  }

  private async getPathConfig(pathName: string): Promise<Record<string, unknown> | null> {
    try {
      return await this.request(
        'GET',
        `/v3/config/paths/get/${encodeURIComponent(pathName)}`,
      );
    } catch (error) {
      if (error instanceof MediaMtxHttpError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const url = `${this.apiBase}${path}`;
    let response: Response;

    try {
      response = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      throw new Error(
        `MediaMTX unreachable at ${this.apiBase}. Is @broviki/mediamtx running? (${String(error)})`,
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw new MediaMtxHttpError(response.status, text || response.statusText);
    }

    if (response.status === 204) {
      return {};
    }

    const text = await response.text();
    if (!text) return {};
    return JSON.parse(text) as Record<string, unknown>;
  }
}

class MediaMtxHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'MediaMtxHttpError';
  }
}
