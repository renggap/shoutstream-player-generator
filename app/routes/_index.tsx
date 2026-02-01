import type { Route } from "./+types/_index";
import { Form, redirect, useActionData } from "react-router";
import { customAlphabet } from "nanoid";
import { saveSlug } from "../services/slug-storage.server";
import { MusicNoteIcon } from "../components/icons/MusicNoteIcon";
import { ThemeToggle } from "../components/ThemeToggle";

// Generate slug with only lowercase letters and numbers (safe for validation)
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz');

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
  const serverType = formData.get("serverType");

  if (!streamUrl || typeof streamUrl !== "string") {
    return { error: "Stream URL is required" };
  }

  try {
    new URL(streamUrl);
  } catch {
    return { error: "Invalid stream URL" };
  }

  if (!serverType || typeof serverType !== "string") {
    return { error: "Server type is required" };
  }

  if (!['shoutcast-v1', 'shoutcast-v2', 'icecast'].includes(serverType)) {
    return { error: "Invalid server type" };
  }

  if (logoUrl && typeof logoUrl === "string" && logoUrl.trim() !== "") {
    try {
      new URL(logoUrl);
    } catch {
      return { error: "Invalid logo URL" };
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

  return (
    <div className="page-background relative overflow-hidden">
      {/* Theme Toggle */}
      <div className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="container-centered relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl mb-6 bg-primary text-primary-foreground shadow-lg relative overflow-hidden">
              <MusicNoteIcon className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 fade-in-delay-1">
              ShoutStream
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground fade-in-delay-2">
              Create beautiful, shareable audio players
            </p>
          </div>

          {/* Form Card */}
          <div className="card p-6 sm:p-8 md:p-12 fade-in-delay-3">
            <Form method="post" className="space-y-6">
              {/* Stream URL Input */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                  <label htmlFor="streamUrl" className="text-base font-semibold">
                    Stream URL
                  </label>
                  <select
                    id="serverType"
                    name="serverType"
                    required
                    className="select flex-1 max-w-[200px]"
                    defaultValue=""
                  >
                    <option value="" disabled>Select server type...</option>
                    <option value="shoutcast-v2">Shoutcast v2</option>
                    <option value="shoutcast-v1">Shoutcast v1</option>
                    <option value="icecast">Icecast</option>
                  </select>
                </div>
                <input
                  type="url"
                  id="streamUrl"
                  name="streamUrl"
                  required
                  placeholder="https://example.com:8000/stream"
                  className="input"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter your Shoutcast or Icecast stream URL
                </p>
              </div>

              {/* Logo URL Input */}
              <div>
                <label htmlFor="logoUrl" className="block text-base font-semibold mb-3">
                  Logo URL <span className="text-muted-foreground text-sm font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  id="logoUrl"
                  name="logoUrl"
                  placeholder="https://example.com/logo.png"
                  className="input"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  Add a custom logo to your player
                </p>
              </div>

              {/* Error Message */}
              {actionData?.error && (
                <div className="p-4 bg-destructive/15 text-destructive border border-destructive/30 rounded-lg">
                  <p className="text-sm font-medium">{actionData.error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="button button-primary w-full py-4 px-8 text-lg font-semibold hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                Generate Player
              </button>
            </Form>

            {/* Features */}
            <div className="mt-8 pt-8 border-t border-border">
              <h3 className="text-lg font-bold mb-4">Features:</h3>
              <ul className="space-y-3">
                <li className="flex items-start text-muted-foreground">
                  <svg className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Live metadata display</span>
                </li>
                <li className="flex items-start text-muted-foreground">
                  <svg className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Shareable link with unique slug</span>
                </li>
                <li className="flex items-start text-muted-foreground">
                  <svg className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Custom logo support</span>
                </li>
                <li className="flex items-start text-muted-foreground">
                  <svg className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Clean, modern design</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
