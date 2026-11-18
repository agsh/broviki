/**
 * Build a user-facing message from onvif / Nest errors.
 * Some cameras return SOAP Faults with HTTP 400; the client may label those as
 * "Unexpected HTTP 400 response (non-SOAP body)" while `error.xml` still has the fault text.
 */
export function formatOnvifError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const withFault = error as Error & {
    faultReason?: string;
    statusCode?: number;
    xml?: string;
    service?: string;
    action?: string;
  };

  const faultFromXml = extractSoapFaultReason(withFault.xml);
  const fault = withFault.faultReason || faultFromXml;

  if (fault) {
    const where = [withFault.service, withFault.action].filter(Boolean).join(' ');
    const authHint = /authority|notauthorized|not authorized|auth/i.test(fault)
      ? ' Check username/password and ONVIF user permissions (WS Security).'
      : '';
    return where ? `${fault} (${where}).${authHint}` : `${fault}.${authHint}`;
  }

  if (
    /Unexpected HTTP 400/i.test(error.message) &&
    !faultFromXml
  ) {
    return `${error.message}. The camera rejected the request (often bad credentials or missing WS Security).`;
  }

  return error.message || 'Unknown ONVIF error';
}

function extractSoapFaultReason(xml?: string): string | undefined {
  if (!xml) return undefined;

  const textMatch =
    xml.match(/<(?:[\w-]+:)?Text\b[^>]*>([^<]+)</i) ||
    xml.match(/<(?:[\w-]+:)?faultstring\b[^>]*>([^<]+)</i);
  const reason = textMatch?.[1]?.trim();
  return reason || undefined;
}
