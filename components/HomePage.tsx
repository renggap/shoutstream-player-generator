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
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center px-6 animate-fade-in">
      <div className="w-full max-w-2xl">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <MusicNoteIcon className="w-16 h-16 text-royal-blue dark:text-dm-royal-blue" />
          </div>
          <h1 className="text-h1 mb-4">
            ShoutStream
          </h1>
          <p className="text-body text-apple-text-secondary dark:text-dm-text-secondary max-w-md mx-auto">
            Generate beautiful, shareable audio players for any Shoutcast or Icecast stream.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
          {/* Stream URL Input - Apple Underlined Style */}
          <div>
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="Stream URL"
              className="input-apple text-h1"
              autoComplete="off"
              required
            />
          </div>

          {/* Logo URL Input */}
          <div>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="Logo URL (optional)"
              className="input-apple text-body"
              autoComplete="off"
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-center text-sm">{error}</p>
          )}

          {/* Generate Button */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              className="btn-primary animate-scale-subtle-hover"
            >
              <PlayIcon className="w-5 h-5 mr-2" />
              Generate Player
            </button>
          </div>
        </form>

        {/* Example Section */}
        <div className="mt-16 text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <p className="text-muted">
            Example:{' '}
            <code className="px-2 py-1 bg-apple-gray dark:bg-dm-gray text-apple-text-secondary dark:text-dm-text-secondary rounded text-xs">
              https://alfaruq1.ssl.radioislam.my.id/
            </code>
          </p>
        </div>
      </div>
    </div>
  );
};