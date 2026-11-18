import type { Onvif } from 'onvif';

const SCOPE_BASE = 'onvif://www.onvif.org/';

export type DeviceServiceSummary = {
  name: string;
  namespace: string;
  xaddr?: string;
  version?: string;
};

export type CameraDeviceInfo = {
  manufacturer?: string;
  model?: string;
  firmware?: string;
  serialNumber?: string;
  hardwareId?: string;
  /** ONVIF scope name (onvif://…/name/…) */
  name?: string;
  location?: string;
  hardware?: string;
  /** Primary / joined ONVIF conformance profiles, e.g. "T, S" */
  profile?: string;
  /** Device types from scopes */
  type?: string;
  /** All ONVIF Profile/* scopes */
  supportedProfiles: string[];
  /** GetServices (or capability-derived) list */
  supportedServices: DeviceServiceSummary[];
};

function asScopeUris(scopes: unknown): string[] {
  if (!Array.isArray(scopes)) return [];
  return scopes
    .map((scope) => {
      if (typeof scope === 'string') return scope;
      if (scope && typeof scope === 'object' && 'scopeItem' in scope) {
        const item = (scope as { scopeItem?: unknown }).scopeItem;
        return typeof item === 'string' ? item : '';
      }
      return '';
    })
    .filter(Boolean);
}

function decodeScopeValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function scopePath(uri: string, prefix: string): string | undefined {
  const lower = uri.toLowerCase();
  const needle = `${SCOPE_BASE}${prefix}`.toLowerCase();
  if (!lower.startsWith(needle)) return undefined;
  const rest = uri.slice(SCOPE_BASE.length + prefix.length);
  if (!rest || rest === '/') return undefined;
  return decodeScopeValue(rest.replace(/^\//, ''));
}

function serviceNameFromNamespace(namespace: string): string {
  try {
    const url = new URL(namespace);
    const parts = url.pathname.replace(/^\//, '').split('/').filter(Boolean);
    // e.g. ver10/media → media, ver20/media → media2, ver10/device → device
    if (parts[0] === 'ver20' && parts[1] === 'media') return 'media2';
    if (parts.length >= 2) return parts[1];
    return parts[0] || namespace;
  } catch {
    return namespace;
  }
}

function formatVersion(version: unknown): string | undefined {
  if (!version || typeof version !== 'object') return undefined;
  const major = (version as { major?: unknown }).major;
  const minor = (version as { minor?: unknown }).minor;
  if (major == null) return undefined;
  return minor == null ? String(major) : `${major}.${minor}`;
}

/**
 * Parse ONVIF device scopes into name / location / hardware / profile / type fields.
 */
export function parseDeviceScopes(scopes: unknown): Pick<
  CameraDeviceInfo,
  'name' | 'location' | 'hardware' | 'profile' | 'type' | 'supportedProfiles'
> {
  const uris = asScopeUris(scopes);
  const names: string[] = [];
  const locations: string[] = [];
  const hardwares: string[] = [];
  const profiles: string[] = [];
  const types: string[] = [];

  for (const uri of uris) {
    const name = scopePath(uri, 'name');
    if (name) names.push(name);
    const location = scopePath(uri, 'location');
    if (location) locations.push(location);
    const hardware = scopePath(uri, 'hardware');
    if (hardware) hardwares.push(hardware);
    const profile = scopePath(uri, 'Profile') ?? scopePath(uri, 'profile');
    if (profile) profiles.push(profile);
    const type = scopePath(uri, 'type');
    if (type) types.push(type);
  }

  const uniqueProfiles = [...new Set(profiles)];
  const uniqueTypes = [...new Set(types)];

  return {
    name: names[0],
    location: locations.join(', ') || undefined,
    hardware: hardwares[0],
    profile: uniqueProfiles.join(', ') || undefined,
    type: uniqueTypes.join(', ') || undefined,
    supportedProfiles: uniqueProfiles,
  };
}

export function summarizeServices(services: unknown): DeviceServiceSummary[] {
  if (!Array.isArray(services)) return [];
  const result: DeviceServiceSummary[] = [];
  for (const service of services) {
    if (!service || typeof service !== 'object') continue;
    const record = service as {
      namespace?: string;
      XAddr?: string;
      xaddr?: string;
      version?: unknown;
    };
    const namespace = record.namespace ? String(record.namespace) : '';
    if (!namespace) continue;
    result.push({
      name: serviceNameFromNamespace(namespace),
      namespace,
      xaddr: record.XAddr
        ? String(record.XAddr)
        : record.xaddr
          ? String(record.xaddr)
          : undefined,
      version: formatVersion(record.version),
    });
  }
  return result;
}

/**
 * Best-effort GetDeviceInformation + GetScopes; services already filled by connect.
 */
export async function collectDeviceInfo(onvif: Onvif): Promise<CameraDeviceInfo> {
  let manufacturer: string | undefined;
  let model: string | undefined;
  let firmware: string | undefined;
  let serialNumber: string | undefined;
  let hardwareId: string | undefined;

  try {
    const info =
      onvif.deviceInformation ?? (await onvif.device.getDeviceInformation());
    manufacturer = info?.manufacturer;
    model = info?.model;
    firmware = info?.firmwareVersion;
    serialNumber = info?.serialNumber;
    hardwareId = info?.hardwareId;
  } catch {
    // optional
  }

  let scopeFields: ReturnType<typeof parseDeviceScopes> = {
    supportedProfiles: [],
  };
  try {
    const scopes =
      onvif.device.scopes?.length > 0
        ? onvif.device.scopes
        : await onvif.device.getScopes();
    scopeFields = parseDeviceScopes(scopes);
  } catch {
    // optional
  }

  return {
    manufacturer,
    model,
    firmware,
    serialNumber,
    hardwareId,
    ...scopeFields,
    supportedServices: summarizeServices(onvif.services),
  };
}
