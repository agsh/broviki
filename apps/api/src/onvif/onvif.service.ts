import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { Onvif, type NotificationMessage } from 'onvif';
import type { CameraConfig } from './camera-config';
import {
  isTransientPullError,
  toCameraEventRecord,
  type CameraEventRecord,
} from './camera-event.util';
import { formatOnvifError } from './onvif-error.util';

const MAX_EVENTS_PER_CAMERA = 300;

export type CameraEventsMeta = {
  cameraId: string;
  connected: boolean;
  /** True while ONVIF pull-point is active for this camera. */
  subscribed: boolean;
  listenerCount: number;
  lastError?: string;
  nextSeq: number;
};

export type CameraEventPayload = {
  cameraId: string;
  event: CameraEventRecord;
  listenerCount: number;
};

type CameraEventState = {
  seq: number;
  events: CameraEventRecord[];
  lastError?: string;
  /** ONVIF `event` / `eventError` listeners currently attached. */
  attached: boolean;
  onEvent: (msg: NotificationMessage) => void;
  onError: (error: unknown) => void;
};

@Injectable()
export class OnvifService extends EventEmitter {
  private readonly logger = new Logger(OnvifService.name);
  private readonly cameras = new Map<string, Onvif>();
  private readonly eventState = new Map<string, CameraEventState>();
  /** WebSocket (or other) client ids listening per camera. */
  private readonly eventListeners = new Map<string, Set<string>>();
  /** Bumps on remove so in-flight seedPullPointSync does not touch a closed client. */
  private readonly sessionGeneration = new Map<string, number>();

  constructor() {
    super();
    // Avoid MaxListenersExceededWarning when several gateways/services attach.
    this.setMaxListeners(50);
  }

  list(): Map<string, Onvif> {
    return this.cameras;
  }

  get(cameraId: string): Onvif | undefined {
    return this.cameras.get(cameraId);
  }

  isConnected(cameraId: string): boolean {
    return this.cameras.has(cameraId);
  }

  getListenerCount(cameraId: string): number {
    return this.eventListeners.get(cameraId)?.size ?? 0;
  }

  getEventsMeta(cameraId: string): CameraEventsMeta {
    const state = this.eventState.get(cameraId);
    return {
      cameraId,
      connected: this.isConnected(cameraId),
      subscribed: Boolean(state?.attached),
      listenerCount: this.getListenerCount(cameraId),
      lastError: state?.lastError,
      nextSeq: state?.seq ?? 0,
    };
  }

  getEvents(cameraId: string, afterSeq = 0): {
    connected: boolean;
    subscribed: boolean;
    listenerCount: number;
    events: CameraEventRecord[];
    nextSeq: number;
    lastError?: string;
  } {
    const state = this.eventState.get(cameraId);
    const events = state
      ? state.events.filter((event) => event.seq > afterSeq)
      : [];
    const meta = this.getEventsMeta(cameraId);

    return {
      connected: meta.connected,
      subscribed: meta.subscribed,
      listenerCount: meta.listenerCount,
      events,
      nextSeq: meta.nextSeq || afterSeq,
      lastError: meta.lastError,
    };
  }

  clearEvents(cameraId: string) {
    const state = this.eventState.get(cameraId);
    if (state) {
      state.events = [];
      state.lastError = undefined;
    }
    this.emit('camera-events-cleared', this.getEventsMeta(cameraId));
  }

  /**
   * Register a UI/client listener. First client starts ONVIF pull-point;
   * last client leaving stops it.
   */
  acquireEventListener(cameraId: string, clientId: string): {
    connected: boolean;
    subscribed: boolean;
    listenerCount: number;
    events: CameraEventRecord[];
    nextSeq: number;
    lastError?: string;
  } {
    let clients = this.eventListeners.get(cameraId);
    if (!clients) {
      clients = new Set();
      this.eventListeners.set(cameraId, clients);
    }

    const wasEmpty = clients.size === 0;
    clients.add(clientId);

    if (wasEmpty || !this.eventState.get(cameraId)?.attached) {
      this.startPullPoint(cameraId);
    }

    this.emitMeta(cameraId);
    return this.getEvents(cameraId, 0);
  }

  releaseEventListener(cameraId: string, clientId: string): void {
    const clients = this.eventListeners.get(cameraId);
    if (!clients?.has(clientId)) return;

    clients.delete(clientId);
    if (clients.size === 0) {
      this.eventListeners.delete(cameraId);
      this.stopPullPoint(cameraId);
    }

    this.emitMeta(cameraId);
  }

  /** Drop all WS listeners for a client (disconnect). */
  releaseAllEventListeners(clientId: string): string[] {
    const affected: string[] = [];
    for (const cameraId of [...this.eventListeners.keys()]) {
      const clients = this.eventListeners.get(cameraId);
      if (!clients?.has(clientId)) continue;
      this.releaseEventListener(cameraId, clientId);
      affected.push(cameraId);
    }
    return affected;
  }

  async remove(cameraId: string): Promise<void> {
    this.sessionGeneration.set(
      cameraId,
      (this.sessionGeneration.get(cameraId) ?? 0) + 1,
    );

    const onvif = this.cameras.get(cameraId);
    if (!onvif) {
      this.stopPullPoint(cameraId);
      this.eventState.delete(cameraId);
      this.emitMeta(cameraId);
      return;
    }

    // Detach before deleting state so off('event') can run (stops auto pull-point).
    this.stopPullPoint(cameraId);
    this.eventState.delete(cameraId);
    this.cameras.delete(cameraId);
    try {
      // Unsubscribe pull-point + destroy events HTTP agent.
      await onvif.close();
    } catch (error) {
      console.warn(
        `onvif.close() failed for ${cameraId}:`,
        error instanceof Error ? error.message : error,
      );
    }

    this.emitMeta(cameraId);
  }

  /** Profiles filled on connect, or via media.getProfiles() / media2. */
  getProfiles(onvif: Onvif) {
    if (Array.isArray(onvif.profiles) && onvif.profiles.length) {
      return onvif.profiles;
    }
    if (Array.isArray(onvif.media.profiles) && onvif.media.profiles.length) {
      return onvif.media.profiles;
    }
    return [];
  }

  resolvePtzProfileToken(onvif: Onvif): string {
    const profiles = this.getProfiles(onvif);
    const profileWithPtz = profiles.find((p) => p.PTZConfiguration != null);
    if (profileWithPtz?.token) {
      return profileWithPtz.token;
    }

    const token =
      onvif.activeMediaProfile?.profileToken ??
      onvif.activeSource?.profileToken ??
      onvif.defaultProfile?.token ??
      profiles[0]?.token;

    if (!token) {
      throw new Error('Camera has no media profile suitable for PTZ.');
    }
    return token;
  }

  /**
   * Ensure media profiles are loaded. Some cameras leave `onvif.profiles` empty after
   * connect() when GetProfiles failed (auth) — retry explicitly and surface the fault.
   */
  async ensureProfiles(onvif: Onvif): Promise<void> {
    if (this.getProfiles(onvif).length > 0) {
      return;
    }

    const errors: string[] = [];

    if (onvif.uri.media) {
      try {
        await onvif.media.getProfiles();
        if (this.getProfiles(onvif).length > 0) return;
      } catch (error) {
        errors.push(formatOnvifError(error));
      }
    }

    if (onvif.uri.media2 || onvif.media2Support) {
      try {
        if (!onvif.uri.media2 && onvif.uri.media) {
          onvif.uri.media2 = onvif.uri.media;
        }
        onvif.media2Support = true;
        const media2Profiles = await onvif.media2.getProfiles({ type: ['All'] });
        if (Array.isArray(media2Profiles) && media2Profiles.length && !onvif.profiles.length) {
          // media2.getProfiles returns Media2 shapes; connect probe normally maps them.
        }
        if (this.getProfiles(onvif).length > 0) return;
        if (Array.isArray(media2Profiles) && media2Profiles.length > 0) return;
      } catch (error) {
        errors.push(formatOnvifError(error));
      }
    }

    const detail = errors[0] || 'GetProfiles returned no media profiles';
    throw new Error(
      `ONVIF connected but media profiles are unavailable: ${detail}`,
    );
  }

  async add(camera: CameraConfig): Promise<Onvif> {
    console.log('Adding camera:', camera);

    await this.remove(camera.id);

    const onvif = new Onvif({
      hostname: camera.hostname,
      port: camera.port,
      username: camera.username,
      password: camera.password,
      path: camera.path,
      useSecure: camera.useSecure,
      // Prefer WS-Security PasswordDigest unless the UI explicitly disabled it.
      useWSSecurity: camera.useWSSecurity ?? true,
    });

    try {
      await onvif.connect();
      await this.ensureProfiles(onvif);
    } catch (error) {
      try {
        await onvif.close();
      } catch {
        // ignore
      }
      throw new Error(formatOnvifError(error));
    }

    if (!onvif.uri.ptz) {
      console.warn(`Camera ${camera.id}: no PTZ service endpoint in device capabilities`);
    } else {
      try {
        const ptzProfileToken = this.resolvePtzProfileToken(onvif);
        console.log(`Camera ${camera.id}: PTZ profile token = ${ptzProfileToken}`);
      } catch (error) {
        // PTZ is optional — connect must still succeed for streaming-only cameras.
        console.warn(
          `Camera ${camera.id}: PTZ not ready: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    this.cameras.set(camera.id, onvif);

    // Resume pull-point only if UI clients are still waiting for events.
    if (this.getListenerCount(camera.id) > 0) {
      this.startPullPoint(camera.id);
    } else {
      this.emitMeta(camera.id);
    }

    return onvif;
  }

  private ensureEventState(cameraId: string): CameraEventState {
    let state = this.eventState.get(cameraId);
    if (state) return state;

    state = {
      seq: 0,
      events: [],
      attached: false,
      onEvent: (msg: NotificationMessage) => {
        try {
          this.logger.log(
            `Пришел event [${cameraId}]: ${JSON.stringify(msg)}`,
          );
          state!.seq += 1;
          const record = toCameraEventRecord(cameraId, state!.seq, msg);
          state!.events.push(record);
          if (state!.events.length > MAX_EVENTS_PER_CAMERA) {
            state!.events.splice(0, state!.events.length - MAX_EVENTS_PER_CAMERA);
          }
          state!.lastError = undefined;
          this.emit('camera-event', {
            cameraId,
            event: record,
            listenerCount: this.getListenerCount(cameraId),
          } satisfies CameraEventPayload);
        } catch (error) {
          this.logger.warn(
            `Failed to record event [${cameraId}]: ${formatOnvifError(error)}`,
          );
        }
      },
      onError: (error: unknown) => {
        // Empty PullMessages on Tapo closes the socket — ignore and keep pulling.
        if (isTransientPullError(error)) {
          return;
        }
        state!.lastError = formatOnvifError(error);
        this.logger.warn(`ONVIF eventError [${cameraId}]: ${state!.lastError}`);
        this.emitMeta(cameraId);
      },
    };

    this.eventState.set(cameraId, state);
    return state;
  }

  /** Attach ONVIF listeners → library auto-creates pull-point on first `event` listener. */
  private startPullPoint(cameraId: string) {
    const onvif = this.cameras.get(cameraId);
    if (!onvif) {
      this.logger.debug(
        `startPullPoint skipped [${cameraId}]: camera not connected`,
      );
      return;
    }

    const state = this.ensureEventState(cameraId);
    if (state.attached) return;

    onvif.on('event', state.onEvent);
    onvif.on('eventError', state.onError);
    state.attached = true;

    const generation = this.sessionGeneration.get(cameraId) ?? 0;
    void this.seedPullPointSync(cameraId, onvif, generation);
    this.logger.log(`ONVIF pull-point started [${cameraId}]`);
  }

  /** Detach listeners → library unsubscribes pull-point when last `event` listener is gone. */
  private stopPullPoint(cameraId: string) {
    const state = this.eventState.get(cameraId);
    if (!state?.attached) return;

    const onvif = this.cameras.get(cameraId);
    if (onvif) {
      onvif.off('event', state.onEvent);
      onvif.off('eventError', state.onError);
    }
    state.attached = false;
    this.logger.log(`ONVIF pull-point stopped [${cameraId}]`);
  }

  private emitMeta(cameraId: string) {
    this.emit('camera-events-meta', this.getEventsMeta(cameraId));
  }

  /** Best-effort sync so property-state events are queued for the next successful pull. */
  private async seedPullPointSync(
    cameraId: string,
    onvif: Onvif,
    generation: number,
  ) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (
      (this.sessionGeneration.get(cameraId) ?? 0) !== generation ||
      this.cameras.get(cameraId) !== onvif ||
      !this.eventState.get(cameraId)?.attached
    ) {
      return;
    }
    try {
      await onvif.events.globalSubscription.setSynchronizationPoint();
    } catch (error) {
      this.logger.debug(
        `SetSynchronizationPoint skipped [${cameraId}]: ${formatOnvifError(error)}`,
      );
    }
  }
}
