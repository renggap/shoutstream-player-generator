import React, { useState } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { MusicNoteIcon } from './icons/MusicNoteIcon';
import { normalizeStreamUrl } from '../utils/stream-url';

export const HomePage: React.FC = () => {
  const [streamUrl, setStreamUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateStreamUrl = (url: string): { isValid: boolean; error?: string; normalizedUrl?: string } => {
    if (!url.trim()) {
      return { isValid: false, error: 'Please enter a stream URL.' };
    }

    try {
      const parsedUrl = new URL(url);

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { isValid: false, error: 'Stream URL must use HTTP or HTTPS protocol.' };
      }

      if (!parsedUrl.hostname) {
        return { isValid: false, error: 'Please enter a valid stream URL with a hostname.' };
      }

      // Normalize URL for Shoutcast/Icecast servers
      const normalizedUrl = normalizeStreamUrl(url);

      return { isValid: true, normalizedUrl };
    } catch (error) {
      return { isValid: false, error: 'Please enter a valid URL format.' };
    }
  };

  const validateLogoUrl = (url: string): { isValid: boolean; error?: string } => {
    if (!url.trim()) return { isValid: true };

    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { isValid: false, error: 'Logo URL must use HTTP or HTTPS protocol.' };
      }
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Please enter a valid logo URL.' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const streamValidation = validateStreamUrl(streamUrl);
    if (!streamValidation.isValid) {
      setError(streamValidation.error!);
      setIsLoading(false);
      return;
    }

    const logoValidation = validateLogoUrl(logoUrl);
    if (!logoValidation.isValid) {
      setError(logoValidation.error!);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/create-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamUrl: streamValidation.normalizedUrl!,
          logoUrl: logoUrl.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create player');
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create player');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        {/* Header Section - More refined spacing */}
        <div className="text-center mb-20">
          {/* Icon with subtle background */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-apple-gray dark:bg-dm-gray flex items-center justify-center">
              <MusicNoteIcon className="w-10 h-10 text-royal-blue dark:text-dm-royal-blue" />
            </div>
          </div>

          {/* Title with better typography */}
          <h1 className="text-[3rem] leading-none font-semibold tracking-tight text-graphite dark:text-white mb-4">
            ShoutStream
          </h1>

          {/* Description with improved spacing */}
          <p className="text-lg text-apple-text-secondary dark:text-dm-text-secondary max-w-md mx-auto leading-relaxed">
            Generate beautiful, shareable audio players for any Shoutcast or Icecast stream.
          </p>
        </div>

        {/* Form Section - Improved spacing */}
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Stream URL Input */}
          <div className="group">
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="Stream URL"
              className="input-apple text-2xl dark:text-white placeholder:text-apple-border dark:placeholder:text-dm-gray-light transition-all duration-200"
              autoComplete="off"
              required
            />
          </div>

          {/* Logo URL Input */}
          <div className="group">
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="Logo URL (optional)"
              className="input-apple text-base dark:text-white placeholder:text-apple-border dark:placeholder:text-dm-gray-light transition-all duration-200"
              autoComplete="off"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex justify-center">
              <p className="text-red-500 text-sm font-medium px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</p>
            </div>
          )}

          {/* Generate Button - Enhanced */}
          <div className="flex justify-center pt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary text-base px-10 py-4 flex items-center gap-3 hover:scale-105 active:scale-95 transition-transform duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5" />
                  Generate Player
                </>
              )}
            </button>
          </div>
        </form>

        {/* Example Section - Improved styling */}
        <div className="mt-20 text-center">
          <p className="text-muted mb-2">Try it with an example stream:</p>
          <button
            type="button"
            onClick={() => setStreamUrl('https://alfaruq1.ssl.radioislam.my.id/')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-apple-gray dark:bg-dm-gray hover:bg-apple-gray-dark dark:hover:bg-dm-gray-light text-apple-text-secondary dark:text-dm-text-secondary rounded-lg text-sm transition-all duration-200 hover:scale-105"
          >
            <MusicNoteIcon className="w-4 h-4" />
            <span>Load example stream</span>
          </button>
        </div>
      </div>
    </div>
  );
};
