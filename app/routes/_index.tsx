import type { Route } from "./+types/_index";
import { Form, redirect, useActionData } from "react-router";
import { customAlphabet } from "nanoid";
import { useState } from "react";
import { saveSlug } from "../services/slug-storage.server";
import { MusicNoteIcon } from "../components/icons/MusicNoteIcon";
import { ThemeToggle } from "../components/ThemeToggle";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ShoutStream — Studio Audio Player Generator" },
    { name: "description", content: "Create elegant, high-fidelity audio stream players for Shoutcast and Icecast." },
  ];
}

interface ActionData {
  error?: string;
  slug?: string;
}

export async function action({ request }: Route.ActionArgs) {
  const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz');
  const formData = await request.formData();
  let streamUrl = formData.get("streamUrl");
  let logoUrl = formData.get("logoUrl");
  const serverType = formData.get("serverType");

  if (!streamUrl || typeof streamUrl !== "string") {
    return { error: "Stream URL is required" };
  }

  streamUrl = streamUrl.trim();
  if (!streamUrl.startsWith("http://") && !streamUrl.startsWith("https://")) {
    streamUrl = `http://${streamUrl}`;
  }

  try {
    new URL(streamUrl);
  } catch {
    return { error: "Please enter a valid HTTP/HTTPS stream URL" };
  }

  if (!serverType || typeof serverType !== "string") {
    return { error: "Server protocol type is required" };
  }

  if (!['shoutcast-v1', 'shoutcast-v2', 'icecast'].includes(serverType)) {
    return { error: "Invalid server type specified" };
  }

  if (logoUrl && typeof logoUrl === "string" && logoUrl.trim() !== "") {
    try {
      new URL(logoUrl);
    } catch {
      return { error: "Please enter a valid logo image URL" };
    }
  }

  const slug = nanoid(8);

  await saveSlug(slug, {
    streamUrl,
    logoUrl: logoUrl && typeof logoUrl === "string" && logoUrl.trim() !== "" ? logoUrl : undefined,
    serverType: serverType as 'shoutcast-v1' | 'shoutcast-v2' | 'icecast',
  });

  return redirect(`/player/${slug}`);
}

export default function Index() {
  const actionData = useActionData<ActionData>();
  const [streamUrl, setStreamUrl] = useState("");
  const [serverType, setServerType] = useState("shoutcast-v2");
  const [logoUrl, setLogoUrl] = useState("");

  return (
    <div className="min-h-screen bg-luxury-pattern relative flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      
      {/* Top Luxury Navigation Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between pb-8 mb-8 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center font-serif-luxury font-bold text-lg border border-white/10 shadow-sm">
            SS
          </div>
          <div>
            <span className="font-serif-luxury text-xl font-bold tracking-tight text-[var(--foreground)] block leading-none">
              SHOUTSTREAM
            </span>
            <span className="text-[10px] font-mono-tech uppercase tracking-widest text-[var(--muted-foreground)]">
              STUDIO SUITE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto w-full my-auto">
        
        {/* Editorial Hero Intro */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="tag-badge tag-badge-gold mb-4 inline-flex">
            HIGH-FIDELITY AUDIO PLAYER ENGINE
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-luxury font-bold text-[var(--foreground)] leading-tight mb-4">
            Craft Minimal Audio Players for Live Streams
          </h1>
          <p className="text-base sm:text-lg text-[var(--muted-foreground)] font-normal max-w-2xl mx-auto leading-relaxed">
            Generate shareable, embeddable players with live metadata parsing, custom branding, and responsive design for Shoutcast & Icecast stations.
          </p>
        </div>

        {/* Studio Builder Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Form Column */}
          <div className="lg:col-span-7">
            <div className="card-luxury p-6 sm:p-8">
              
              <div className="mb-6 pb-4 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-serif-luxury font-bold text-[var(--foreground)]">
                    Stream Configuration
                  </h2>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Configure your live audio endpoint parameters
                  </p>
                </div>
                <span className="text-xs font-mono-tech text-[var(--primary)] uppercase tracking-wider">
                  STEP 01/02
                </span>
              </div>

              <Form method="post" className="space-y-5">
                
                {/* Server Protocol Selection */}
                <div>
                  <label htmlFor="serverType" className="block text-xs font-mono-tech uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                    Server Protocol <span className="text-[var(--primary)]">*</span>
                  </label>
                  <select
                    id="serverType"
                    name="serverType"
                    required
                    className="select-luxury"
                    value={serverType}
                    onChange={(e) => setServerType(e.target.value)}
                  >
                    <option value="icecast">Icecast Server (/status-json.xsl)</option>
                    <option value="shoutcast-v2">Shoutcast v2 Server (/stats)</option>
                    <option value="shoutcast-v1">Shoutcast v1 Server (/stats?sid=1)</option>
                  </select>
                </div>

                {/* Stream URL Input */}
                <div>
                  <label htmlFor="streamUrl" className="block text-xs font-mono-tech uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                    Stream Endpoint URL <span className="text-[var(--primary)]">*</span>
                  </label>
                  <input
                    type="url"
                    id="streamUrl"
                    name="streamUrl"
                    required
                    placeholder="https://example.com:8000/stream"
                    className="input-luxury font-mono-tech text-xs"
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                  />
                  <p className="mt-1.5 text-[11px] text-[var(--subtle-foreground)]">
                    Supports direct audio endpoints, MP3/AAC streams, and HTTPS proxies.
                  </p>
                </div>

                {/* Logo URL Input */}
                <div>
                  <label htmlFor="logoUrl" className="block text-xs font-mono-tech uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                    Station Artwork / Logo URL <span className="text-[var(--subtle-foreground)] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    id="logoUrl"
                    name="logoUrl"
                    placeholder="https://example.com/artwork.jpg"
                    className="input-luxury font-mono-tech text-xs"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                  <p className="mt-1.5 text-[11px] text-[var(--subtle-foreground)]">
                    Square PNG/JPEG image link for album cover display.
                  </p>
                </div>

                {/* Error Message */}
                {actionData?.error && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-md text-xs font-mono-tech">
                    ⚠ {actionData.error}
                  </div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  className="btn-luxury btn-luxury-primary w-full py-3.5 text-xs font-semibold tracking-widest"
                >
                  Generate Studio Player
                </button>
              </Form>

            </div>
          </div>

          {/* Right Feature Specs Column */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Live Visual Card */}
            <div className="card-luxury p-6 bg-[var(--surface-elevated)] border-[var(--border)]">
              <div className="flex items-center gap-2 mb-3">
                <MusicNoteIcon className="w-4 h-4 text-[var(--primary)]" />
                <h3 className="text-sm font-serif-luxury font-bold text-[var(--foreground)] uppercase tracking-wider">
                  Live Player Preview
                </h3>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-4">
                Your generated player will feature tactile controls, automated metadata parsing, and responsive website embed options.
              </p>

              <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[var(--primary-subtle)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--primary)]">
                  <MusicNoteIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
                    <span className="text-[10px] font-mono-tech uppercase text-[var(--primary)]">
                      {serverType.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="text-sm font-serif-luxury font-bold text-[var(--foreground)] truncate">
                    {streamUrl ? "Custom Radio Broadcast" : "Sample Audio Stream"}
                  </h4>
                  <p className="text-[11px] text-[var(--muted-foreground)] font-mono-tech truncate">
                    {streamUrl || "https://example.com:8000/stream"}
                  </p>
                </div>
              </div>
            </div>

            {/* Architecture Specs */}
            <div className="card-luxury p-6 space-y-4">
              <h3 className="text-xs font-mono-tech uppercase tracking-widest text-[var(--muted-foreground)] pb-2 border-b border-[var(--border)]">
                Engine Architecture Specs
              </h3>

              <div className="space-y-3.5">
                <div className="flex items-start gap-3 text-xs">
                  <span className="font-mono-tech text-[var(--primary)] font-semibold">01</span>
                  <div>
                    <h4 className="font-semibold text-[var(--foreground)]">Realtime Stream Metadata</h4>
                    <p className="text-[var(--subtle-foreground)] mt-0.5">Automatic polling of song titles, artist info & live listener metrics.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <span className="font-mono-tech text-[var(--primary)] font-semibold">02</span>
                  <div>
                    <h4 className="font-semibold text-[var(--foreground)]">HTTPS & CORS Proxy Failover</h4>
                    <p className="text-[var(--subtle-foreground)] mt-0.5">Bypasses mixed-content browser restrictions with server proxying.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <span className="font-mono-tech text-[var(--primary)] font-semibold">03</span>
                  <div>
                    <h4 className="font-semibold text-[var(--foreground)]">1-Click Website Embed</h4>
                    <p className="text-[var(--subtle-foreground)] mt-0.5">Generates clean responsive HTML iframe codes for webmasters.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full pt-8 mt-12 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--subtle-foreground)] font-mono-tech gap-4">
        <span>SHOUTSTREAM STUDIO PLATFORM &copy; 2026</span>
        <span>SHOUTCAST &bull; ICECAST &bull; HIGH-FIDELITY</span>
      </footer>

    </div>
  );
}
