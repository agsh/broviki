export interface MediaProfileSummary {
  token: string;
  name: string;
  fixed?: boolean;
  encoding?: string;
  width?: number;
  height?: number;
  frameRate?: number;
  bitrate?: number;
  hasVideo: boolean;
  hasPtz: boolean;
  hasAudio: boolean;
}

/** Minimal shape from onvif Profile / media.profiles entries */
export interface OnvifProfileLike {
  token: string;
  name?: string;
  fixed?: boolean;
  videoSourceConfiguration?: unknown;
  videoEncoderConfiguration?: {
    encoding?: string;
    resolution?: { width?: number; height?: number };
    rateControl?: { frameRateLimit?: number; bitrateLimit?: number };
  };
  audioSourceConfiguration?: unknown;
  audioEncoderConfiguration?: unknown;
  PTZConfiguration?: unknown;
}

export function summarizeProfile(profile: OnvifProfileLike): MediaProfileSummary {
  const encoder = profile.videoEncoderConfiguration;
  return {
    token: profile.token,
    name: profile.name || profile.token,
    fixed: profile.fixed,
    encoding: encoder?.encoding,
    width: encoder?.resolution?.width,
    height: encoder?.resolution?.height,
    frameRate: encoder?.rateControl?.frameRateLimit,
    bitrate: encoder?.rateControl?.bitrateLimit,
    hasVideo: Boolean(encoder || profile.videoSourceConfiguration),
    hasPtz: Boolean(profile.PTZConfiguration),
    hasAudio: Boolean(profile.audioEncoderConfiguration || profile.audioSourceConfiguration),
  };
}

export function parseProfilesJson(raw?: string | null): MediaProfileSummary[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as MediaProfileSummary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
