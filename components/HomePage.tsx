import React, { useState } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { MusicNoteIcon } from './icons/MusicNoteIcon';

interface HomePageProps {
  onGenerate: (streamUrl: string, logoUrl: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onGenerate }) => {
  const [streamUrl, setStreamUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState('');

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

      let normalizedUrl = url.trim();

      if (!normalizedUrl.includes(';stream') && !normalizedUrl.split('/').pop()?.includes('.')) {
        if (!normalizedUrl.endsWith('/')) {
          normalizedUrl += '/';
        }
        normalizedUrl += ';stream.mp3';
      }

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const streamValidation = validateStreamUrl(streamUrl);
    if (!streamValidation.isValid) {
      setError(streamValidation.error!);
      return;
    }

    const logoValidation = validateLogoUrl(logoUrl);
    if (!logoValidation.isValid) {
      setError(logoValidation.error!);
      return;
    }

    setError('');
    onGenerate(streamValidation.normalizedUrl!, logoUrl.trim());
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
              className="btn-primary text-base px-10 py-4 flex items-center gap-3 hover:scale-105 active:scale-95 transition-transform duration-200 shadow-lg hover:shadow-xl"
            >
              <PlayIcon className="w-5 h-5" />
              Generate Player
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
