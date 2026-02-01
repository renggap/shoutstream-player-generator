import type { Route } from "./+types/_index";
import { Form, redirect, useActionData } from "react-router";
import { nanoid } from "nanoid";
import { saveSlug } from "../services/slug-storage.server";
import { MusicNoteIcon } from "../components/icons/MusicNoteIcon";
import { ThemeToggle } from "../components/ThemeToggle";
import { useTheme } from "../hooks/useTheme";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ShoutStream Player Generator" },
    { name: "description", content: "Generate shareable audio players for Shoutcast/Icecast streams" },
  ];
}

interface ActionData {
  error?: string;
  slug?: string;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const streamUrl = formData.get("streamUrl");
  const logoUrl = formData.get("logoUrl");

  // Validate stream URL
  if (!streamUrl || typeof streamUrl !== "string") {
    return { error: "Stream URL is required" };
  }

  try {
    new URL(streamUrl);
  } catch {
    return { error: "Invalid stream URL" };
  }

  // Validate logo URL if provided
  if (logoUrl && typeof logoUrl === "string" && logoUrl.trim() !== "") {
    try {
      new URL(logoUrl);
    } catch {
      return { error: "Invalid logo URL" };
    }
  }

  // Generate a short slug
  const slug = nanoid(8);

  // Save slug configuration
  await saveSlug(slug, {
    streamUrl,
    logoUrl: logoUrl && typeof logoUrl === "string" && logoUrl.trim() !== "" ? logoUrl : undefined,
  });

  // Redirect to player page
  return redirect(`/player/${slug}`);
}

export default function Index() {
  const actionData = useActionData<ActionData>();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-royal-blue dark:bg-dm-royal-blue rounded-2xl mb-6 shadow-lg">
              <MusicNoteIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              ShoutStream Player Generator
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Create shareable audio players for your Shoutcast/Icecast streams
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <Form method="post" className="space-y-6">
              {/* Stream URL Input */}
              <div>
                <label htmlFor="streamUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stream URL *
                </label>
                <input
                  type="url"
                  id="streamUrl"
                  name="streamUrl"
                  required
                  placeholder="https://example.com:8000/stream"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-royal-blue focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Enter your Shoutcast or Icecast stream URL
                </p>
              </div>

              {/* Logo URL Input */}
              <div>
                <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Logo URL (optional)
                </label>
                <input
                  type="url"
                  id="logoUrl"
                  name="logoUrl"
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-royal-blue focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Add a custom logo to your player
                </p>
              </div>

              {/* Error Message */}
              {actionData?.error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{actionData.error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 px-6 bg-royal-blue dark:bg-dm-royal-blue text-white font-medium rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-royal-blue focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                Generate Player
              </button>
            </Form>

            {/* Features */}
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Features:</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Live metadata display (song title, listeners)
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Shareable link with unique slug
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Custom logo support
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Dark/light theme support
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
