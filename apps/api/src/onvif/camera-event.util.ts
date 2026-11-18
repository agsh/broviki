import { coerceNotificationMessage, type NotificationMessage } from 'onvif';

export type CameraEventItem = {
  name: string;
  value: string;
};

export type CameraEventRecord = {
  id: string;
  seq: number;
  receivedAt: string;
  topic?: string;
  utcTime?: string;
  propertyOperation?: string;
  source: CameraEventItem[];
  data: CameraEventItem[];
  key: CameraEventItem[];
};

type ItemListLike = {
  simpleItem?: Array<{ name?: string; value?: unknown }> | { name?: string; value?: unknown };
};

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function itemListToPairs(list: ItemListLike | undefined): CameraEventItem[] {
  const items = asArray(list?.simpleItem);
  return items
    .filter((item) => item?.name)
    .map((item) => ({
      name: String(item.name),
      value: item.value === undefined || item.value === null ? '' : String(item.value),
    }));
}

function topicToString(topic: unknown): string | undefined {
  if (topic == null) return undefined;
  if (typeof topic === 'string') return topic;
  if (typeof topic === 'object') {
    const record = topic as { _?: unknown };
    if (record._ != null) return String(record._);
  }
  return undefined;
}

function normalizeNotificationMessage(msg: NotificationMessage): NotificationMessage {
  const anyMsg = msg as NotificationMessage & { message?: unknown };
  const outer = anyMsg.message as Record<string, unknown> | undefined;
  if (outer && !('message' in outer) && 'utcTime' in outer) {
    anyMsg.message = { message: outer as unknown as NotificationMessage['message']['message'] };
  }
  return coerceNotificationMessage(anyMsg);
}

export function toCameraEventRecord(
  cameraId: string,
  seq: number,
  msg: NotificationMessage,
): CameraEventRecord {
  const normalized = normalizeNotificationMessage(msg);
  const message = normalized.message?.message;
  const utc = message?.utcTime;

  return {
    id: `${cameraId}:${seq}`,
    seq,
    receivedAt: new Date().toISOString(),
    topic: topicToString(normalized.topic),
    utcTime:
      utc instanceof Date
        ? utc.toISOString()
        : utc
          ? String(utc)
          : undefined,
    propertyOperation: message?.propertyOperation,
    source: itemListToPairs(message?.source as ItemListLike | undefined),
    data: itemListToPairs(message?.data as ItemListLike | undefined),
    key: itemListToPairs(message?.key as ItemListLike | undefined),
  };
}

/**
 * Tapo C220 1.4.4+: empty PullMessages drops TCP with no HTTP body (socket hang up).
 * When an event is pending the camera returns a normal SOAP PullMessagesResponse.
 * @see https://community.tp-link.com/en/smart-home/forum/topic/867526
 */
export function isTransientPullError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';

  const haystack = `${message} ${code}`.toLowerCase();
  return (
    haystack.includes('socket hang up') ||
    haystack.includes('econnreset') ||
    haystack.includes('etimedout') ||
    haystack.includes('enetunreach') ||
    haystack.includes('network timeout') ||
    haystack.includes('hpe_closed_connection') ||
    haystack.includes('hpe_invalid') ||
    haystack.includes('empty reply') ||
    haystack.includes('socket closed')
  );
}
