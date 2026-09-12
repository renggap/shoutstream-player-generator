import type { Route } from "./+types/api.proxy";

const PROXY_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-cache",
};

function corsResponse(body: BodyInit | null, init: ResponseInit = {}): Response {
  return new Response(body, {
    ...init,
    headers: { ...PROXY_HEADERS, ...(init.headers || {}) },
  });
}

/**
 * Block SSRF: never proxy to loopback, link-local, unique-local, or
 * private-range hosts. Hostname must resolve to a public address; literal
 * IPs are checked directly, names ending in .local are blocked.
 */
async function isBlockedHost(hostname: string): Promise<boolean> {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }

  // Literal IPv4
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      a === 169 && b === 254 || // link-local incl. cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      a === 192 && b === 168 ||
      a >= 224 // multicast + reserved
    );
  }

  // Literal IPv6
  if (host.includes(":")) {
    const v6 = host.replace(/(^\[|\]$)/g, "");
    return (
      v6 === "::" || v6 === "::1" ||
      v6.startsWith("fe80:") || v6.startsWith("fc") || v6.startsWith("fd")
    );
  }

  // Hostname: resolve and check all addresses (DNS rebinding mitigation).
  // Note: Array.some() cannot be used here — an async callback returns a
  // Promise (always truthy) and would block every resolvable host.
  try {
    // @ts-ignore -- Node types; fetch-only runtimes skip this
    const dns = await import("node:dns/promises");
    const addrs = await dns.lookup(host, { all: true });
    for (const addr of addrs) {
      if (await isBlockedHost(addr.address)) return true;
    }
    return false;
  } catch {
    // No DNS available (e.g. Cloudflare Workers): allow. Browsers block
    // literal-IP tricks there anyway since the check above covers literals.
    return false;
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  let streamUrl = url.searchParams.get("url");

  if (!streamUrl) {
    return corsResponse("Stream URL is required", { status: 400 });
  }

  streamUrl = streamUrl.trim();
  if (!streamUrl.startsWith("http://") && !streamUrl.startsWith("https://")) {
    streamUrl = `http://${streamUrl}`;
  }

  // Validate URL format
  let validatedUrl: URL;
  try {
    validatedUrl = new URL(streamUrl);
  } catch {
    return corsResponse("Invalid stream URL", { status: 400 });
  }

  if (!["http:", "https:"].includes(validatedUrl.protocol)) {
    return corsResponse("Only HTTP and HTTPS protocols are allowed", { status: 400 });
  }

  if (await isBlockedHost(validatedUrl.hostname)) {
    return corsResponse("Blocked host", { status: 403 });
  }

  try {
    const response = await fetch(streamUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Icy-MetaData": "1",
        "Accept": "*/*",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return corsResponse(`Stream returned ${response.status}`, {
        status: response.status,
      });
    }

    const contentType = response.headers.get("Content-Type") || "";

    // Check if this is an audio stream
    const isAudioStream =
      contentType.startsWith("audio/") ||
      contentType.includes("mpeg") ||
      contentType.includes("aac") ||
      contentType.includes("ogg") ||
      contentType.includes("shoutcast") ||
      contentType === "";

    // For non-audio text/JSON/XML metadata responses
    if (!isAudioStream && (contentType.includes("json") || contentType.includes("xml") || contentType.includes("html") || contentType.includes("text"))) {
      const data = await response.arrayBuffer();
      return new Response(data, {
        headers: {
          "Content-Type": contentType,
          ...PROXY_HEADERS,
        },
      });
    }

    // Normalize audio MIME type for browser HTML5 audio element compatibility
    let normalizedContentType = contentType;
    if (contentType.includes("aacp") || contentType.includes("aac-p") || contentType.includes("audio/aac")) {
      normalizedContentType = "audio/aac";
    } else if (!contentType || contentType === "" || contentType.includes("mpeg") || contentType.includes("mp3")) {
      normalizedContentType = "audio/mpeg";
    }

    // response.body can be null for 204/HEAD; an empty readable would hang the
    // audio element forever instead of erroring
    if (!response.body) {
      return corsResponse("Stream returned an empty body", { status: 502 });
    }

    const { readable, writable } = new TransformStream();

    response.body.pipeTo(writable).catch((error) => {
      console.error("Error piping stream:", error);
      try { writable.abort(error); } catch { /* already closed */ }
    });

    return new Response(readable, {
      headers: {
        "Content-Type": normalizedContentType,
        ...PROXY_HEADERS,
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return corsResponse("Failed to fetch stream", { status: 502 });
  }
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method === "OPTIONS") {
    return corsResponse(null);
  }

  return corsResponse("Method not allowed", { status: 405 });
}
