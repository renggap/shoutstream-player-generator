import type { Route } from "./+types/player.$slug";
import { useLoaderData } from "react-router";
import { getSlug, incrementAccessCount, type SlugConfig } from "../services/slug-storage.server";
import { AudioPlayer } from "../components/AudioPlayer";
import { ThemeToggle } from "../components/ThemeToggle";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Player - ${params.slug}` },
    { name: "description", content: "ShoutStream audio player" },
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
    streamUrl: config.streamUrl,
    logoUrl: config.logoUrl,
    serverType: config.serverType,
  });
}

export default function PlayerRoute() {
  const data = useLoaderData<typeof loader>();

  return (
    <>
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      <AudioPlayer streamUrl={data.streamUrl} logoUrl={data.logoUrl} serverType={data.serverType} />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <div className="page-background relative overflow-hidden flex items-center justify-center p-6">
      <div className="card p-8 max-w-md w-full mx-auto relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/15 text-destructive rounded-full mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">
          Player Not Found
        </h1>
        <p className="text-muted-foreground mb-6">
          The player you're looking for doesn't exist or has been removed.
        </p>
        <a
          href="/"
          className="button button-primary inline-flex px-6 py-3 text-sm font-medium hover:scale-105 transition-transform"
        >
          Create New Player
        </a>
      </div>
    </div>
  );
}
