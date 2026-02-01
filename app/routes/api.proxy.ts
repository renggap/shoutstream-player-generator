import type { Route } from "./+types/api.proxy";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const streamUrl = url.searchParams.get("url");

  if (!streamUrl) {
    return new Response("Stream URL is required", { status: 400 });
  }

  // Validate URL format
  let validatedUrl: URL;
  try {
    validatedUrl = new URL(streamUrl);
  } catch {
    return new Response("Invalid stream URL", { status: 400 });
  }

  // Only allow http and https protocols
  if (!["http:", "https:"].includes(validatedUrl.protocol)) {
    return new Response("Only HTTP and HTTPS protocols are allowed", { status: 400 });
  }

  try {
    const response = await fetch(streamUrl, {
      headers: {
        "User-Agent": "ShoutStream-Player/1.0",
      },
    });

    if (!response.ok) {
      return new Response(`Stream returned ${response.status}`, {
        status: response.status,
      });
    }

    // Create a new response with CORS headers
    const { readable, writable } = new TransformStream();

    // Pipe the response body
    response.body?.pipeTo(writable).catch((error) => {
      console.error("Error piping stream:", error);
    });

    return new Response(readable, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "audio/mpeg",
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

// Handle OPTIONS requests for CORS preflight
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
