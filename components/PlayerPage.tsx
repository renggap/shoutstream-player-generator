import React from 'react';
import { AudioPlayer } from './AudioPlayer';

interface PlayerPageProps {
  streamUrl: string;
  logoUrl?: string;
  initialMetadata?: {
    songTitle: string;
    listeners: string | null;
  };
}

export const PlayerPage: React.FC<PlayerPageProps> = ({ streamUrl, logoUrl, initialMetadata }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-graphite dark:text-white mb-2">
            ShoutStream Player
          </h1>
          <p className="text-sm text-apple-text-secondary dark:text-dm-text-secondary">
            Share this URL with your audience
          </p>
        </div>

        {/* Audio Player */}
        <AudioPlayer streamUrl={streamUrl} logoUrl={logoUrl} />
      </div>
    </div>
  );
};