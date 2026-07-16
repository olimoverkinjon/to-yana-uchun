import "server-only";

import { headers } from "next/headers";

export interface RequestContext {
  p_ip_address?: string;
  p_user_agent?: string;
  p_browser?: string;
  p_os?: string;
  p_reason?: string;
}

/**
 * Collects the audit metadata the database cannot observe for itself, shaped
 * to spread straight into a mutation RPC's arguments.
 *
 * Every mutation RPC takes these, because set_request_context() stores them as
 * transaction-local settings and PostgREST gives each request its own
 * transaction — so the context and the write have to travel together or the
 * audit trigger sees nothing. See the mutation RPC migration.
 */
export async function getRequestContext(reason?: string): Promise<RequestContext> {
  const headerList = await headers();
  const userAgent = headerList.get("user-agent") ?? undefined;

  return {
    p_ip_address: clientIp(headerList),
    p_user_agent: userAgent,
    p_browser: userAgent ? detectBrowser(userAgent) : undefined,
    p_os: userAgent ? detectOs(userAgent) : undefined,
    p_reason: reason?.trim() || undefined,
  };
}

/**
 * x-forwarded-for is a comma-separated chain appended to by each proxy, so the
 * client is the leftmost entry. Trusted only as far as the hosting platform's
 * own proxy — it is audit colour, not an authorization input, and the RPC
 * drops it silently if it will not parse as an inet.
 */
function clientIp(headerList: Headers): string | undefined {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerList.get("x-real-ip") ?? undefined;
}

/**
 * Coarse on purpose. The full User-Agent is stored verbatim alongside these,
 * so they are a convenience for scanning the audit list — not the source of
 * truth, and not worth an AGPL-licensed UA-parsing dependency. Order matters:
 * Edge and Opera both claim to be Chrome, and Chrome claims to be Safari.
 */
function detectBrowser(ua: string): string | undefined {
  if (/\bEdg[A-Z]?\//.test(ua)) return "Edge";
  if (/\bOPR\/|\bOpera\//.test(ua)) return "Opera";
  if (/\bSamsungBrowser\//.test(ua)) return "Samsung Internet";
  if (/\bFirefox\/|\bFxiOS\//.test(ua)) return "Firefox";
  if (/\bChrome\/|\bCriOS\//.test(ua)) return "Chrome";
  if (/\bSafari\//.test(ua)) return "Safari";
  return undefined;
}

function detectOs(ua: string): string | undefined {
  if (/\bAndroid\b/.test(ua)) return "Android";
  // iPadOS 13+ reports a desktop-Mac UA; the touch hint is what gives it away.
  if (/\biPhone\b|\biPad\b|\biPod\b/.test(ua)) return "iOS";
  if (/\bMac OS X\b|\bMacintosh\b/.test(ua)) return /\bMobile\b/.test(ua) ? "iOS" : "macOS";
  if (/\bWindows\b/.test(ua)) return "Windows";
  if (/\bCrOS\b/.test(ua)) return "ChromeOS";
  if (/\bLinux\b/.test(ua)) return "Linux";
  return undefined;
}
