import type { Route } from "./+types/player.$slug";
import { useLoaderData, Link } from "react-router";
import { getSlug, incrementAccessCount } from "../services/slug-storage.server";
import { AudioPlayer } from "../components/AudioPlayer";
import { ThemeToggle } from "../components/ThemeToggle";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Studio Player — ${params.slug}` },
    { name: "description", content: "ShoutStream High-Fidelity Audio Stream Player" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { slug } = params;

  if (!slug) {
    throw new Response("Slug not provided", { status: 400 });
  }

  const config = await getSlug(slug);

  if (!config) {
    throw new Response("Player not found", { status: 404 });
  }

  incrementAccessCount(slug).catch((error) => {
    console.error(`Failed to increment access count for slug ${slug}:`, error);
  });

  return Response.json({
    slug,
    streamUrl: config.streamUrl,
    logoUrl: config.logoUrl,
    serverType: config.serverType,
  });
}

interface LoaderData {
  slug: string;
  streamUrl: string;
  logoUrl?: string;
  serverType: any;
}

export default function PlayerRoute() {
  const data = useLoaderData() as LoaderData;

  return (
    <div className="min-h-screen bg-luxury-pattern flex flex-col justify-between p-4 sm:p-6">
      
      {/* Header Bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-2">
        <Link
          to="/"
          className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
        >
          <span>← Back to Studio Generator</span>
        </Link>

        <ThemeToggle />
      </div>

      {/* Audio Player Container */}
      <div className="my-auto py-6">
        <AudioPlayer
          slug={data.slug}
          streamUrl={data.streamUrl}
          logoUrl={data.logoUrl}
          serverType={data.serverType}
        />
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] font-mono-tech uppercase tracking-widest text-[var(--subtle-foreground)] py-4">
        POWERED BY SHOUTSTREAM STUDIO PLATFORM
      </div>

    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <div className="min-h-screen bg-luxury-pattern flex items-center justify-center p-6">
      <div className="card-luxury p-8 max-w-md w-full text-center relative z-10">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto mb-4 font-mono-tech font-bold text-lg">
          !
        </div>
        <h1 className="text-2xl font-serif-luxury font-bold text-[var(--foreground)] mb-2">
          Studio Player Not Found
        </h1>
        <p className="text-xs text-[var(--muted-foreground)] mb-6 font-mono-tech">
          The requested stream player configuration does not exist or has expired.
        </p>
        <Link
          to="/"
          className="btn-luxury btn-luxury-primary w-full py-3 text-xs font-semibold tracking-widest"
        >
          Create New Studio Player
        </Link>
      </div>
    </div>
  );
}
