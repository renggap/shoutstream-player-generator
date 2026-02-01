import type { Route } from "./+types/player.$slug";
import { useLoaderData } from "react-router";
import { getSlug, incrementAccessCount, type SlugConfig } from "../services/slug-storage.server";
import { AudioPlayer } from "../components/AudioPlayer";
import { ThemeToggle } from "../components/ThemeToggle";
import { useTheme } from "../hooks/useTheme";

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

  // Increment access count asynchronously (don't await)
  incrementAccessCount(slug).catch((error) => {
    console.error(`Failed to increment access count for slug ${slug}:`, error);
  });

  return Response.json({
    streamUrl: config.streamUrl,
    logoUrl: config.logoUrl,
  });
}

export default function PlayerRoute() {
  const { theme, toggleTheme } = useTheme();
  const data = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
      <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      <div className="container mx-auto px-4 py-8">
        <AudioPlayer streamUrl={data.streamUrl} logoUrl={data.logoUrl} />
      </div>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Player Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The player you're looking for doesn't exist or has been removed.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-royal-blue dark:bg-dm-royal-blue text-white font-medium rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
        >
          Create New Player
        </a>
      </div>
    </div>
  );
}
