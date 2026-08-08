import type { Route } from "./+types/api.proxy";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  let streamUrl = url.searchParams.get("url");

  if (!streamUrl) {
    return new Response("Stream URL is required", { status: 400 });
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
    return new Response("Invalid stream URL", { status: 400 });
  }

  if (!["http:", "https:"].includes(validatedUrl.protocol)) {
    return new Response("Only HTTP and HTTPS protocols are allowed", { status: 400 });
  }

  try {
    const response = await fetch(streamUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Icy-MetaData": "1",
        "Accept": "*/*",
      },
    });

    if (!response.ok) {
      return new Response(`Stream returned ${response.status}`, {
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
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": "no-cache",
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

    const { readable, writable } = new TransformStream();

    response.body?.pipeTo(writable).catch((error) => {
      console.error("Error piping stream:", error);
    });

    return new Response(readable, {
      headers: {
        "Content-Type": normalizedContentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response("Failed to fetch stream", { status: 502 });
  }
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  return new Response("Method not allowed", { status: 405 });
}
