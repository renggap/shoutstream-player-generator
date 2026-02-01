"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Howl, Howler } from 'howler';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon';
import { VolumeUpIcon } from './icons/VolumeUpIcon';
import { VolumeOffIcon } from './icons/VolumeOffIcon';
import { MusicNoteIcon } from './icons/MusicNoteIcon';
import { UserIcon } from './icons/UserIcon';
import { ShareIcon } from './icons/ShareIcon';
import { fetchStreamMetadata } from '../utils/metadata';
import { generateStreamUrlVariants } from '../utils/stream-url';

import type { ServerType } from '../services/slug-storage.server';

interface AudioPlayerProps {
  streamUrl: string;
  logoUrl?: string;
  serverType: ServerType;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ streamUrl, logoUrl, serverType }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(1);
  const [status, setStatus] = useState('Ready');
  const [metadata, setMetadata] = useState<{ songTitle: string; listeners: string | null }>({ songTitle: 'Loading...', listeners: null });
  const [logoError, setLogoError] = useState(false);
  const [streamHealth, setStreamHealth] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown');
  const [shareTooltip, setShareTooltip] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const urlVariantIndexRef = useRef(0);
  const soundRef = useRef<Howl | null>(null);

  const urlVariants = useMemo(() => generateStreamUrlVariants(streamUrl), [streamUrl]);
  const currentUrlIndex = urlVariantIndexRef.current;

  const effectiveStreamUrl = useMemo(() => {
    const url = urlVariants[currentUrlIndex];
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isInsecureStream = url.startsWith('http:') && isHttps;

    if (isInsecureStream) {
      console.log('Insecure stream detected. Using local CORS proxy.');
      return `/api/proxy?url=${encodeURIComponent(url)}`;
    }

    return url;
  }, [urlVariants, currentUrlIndex]);

  const initializeAudio = useCallback(() => {
    if (soundRef.current) {
      return;
    }

    console.log('Creating AudioContext after user gesture...');

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContext();
    audioContext.resume().then(() => {
      console.log('AudioContext resumed successfully');
    }).catch((err) => {
      console.error('Failed to resume AudioContext:', err);
    });

    console.log('Initializing Howler with URL:', effectiveStreamUrl);

    const sound = new Howl({
      src: [effectiveStreamUrl],
      html5: true,
      format: ['mp3', 'aac', 'ogg'],
      volume: isMuted ? 0 : volume,
      preload: false,
      context: audioContext,
      onplay: () => {
        console.log('Howler onplay fired');
        setIsPlaying(true);
        setStatus('Playing');
        setStreamHealth('healthy');
        retryCountRef.current = 0;
        urlVariantIndexRef.current = 0;
      },
      onpause: () => {
        console.log('Howler onpause fired');
        setIsPlaying(false);
        setStatus('Paused');
      },
      onend: () => {
        console.log('Howler onend fired');
        setIsPlaying(false);
        setStatus('Ended');
      },
      onstop: () => {
        console.log('Howler onstop fired');
        setIsPlaying(false);
        setStatus('Stopped');
      },
      onloaderror: (id, error) => {
        console.error('Howler load error:', error);
        handleStreamError();
      },
      onplayerror: (id, error) => {
        console.error('Howler play error:', error);
        handleStreamError();
      },
      onload: () => {
        console.log('Howler loaded successfully');
      },
    });

    soundRef.current = sound;
    console.log('Howler instance created');
  }, [effectiveStreamUrl, isMuted, volume]);

  const handleStreamError = useCallback(() => {
    setStreamHealth('unhealthy');
    setStatus('Stream error - trying alternative...');

    if (urlVariantIndexRef.current < urlVariants.length - 1) {
      const nextIndex = urlVariantIndexRef.current + 1;
      urlVariantIndexRef.current = nextIndex;
      const nextUrl = urlVariants[nextIndex];
      console.log(`Trying URL variant ${nextIndex + 1}/${urlVariants.length}:`, nextUrl);

      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const proxyUrl = nextUrl.startsWith('http:') && isHttps
        ? `/api/proxy?url=${encodeURIComponent(nextUrl)}`
        : nextUrl;

      setStatus(`Trying alternative path (${nextIndex + 1}/${urlVariants.length})...`);
      setStreamHealth('unknown');

      if (soundRef.current) {
        soundRef.current.unload();
        soundRef.current = new Howl({
          src: [proxyUrl],
          html5: true,
          format: ['mp3', 'aac', 'ogg'],
          volume: isMuted ? 0 : volume,
        });
      }
      return;
    }

    if (retryCountRef.current < 3) {
      setTimeout(() => {
        urlVariantIndexRef.current = 0;
        retryCountRef.current = retryCountRef.current + 1;
        console.log(`Retrying stream connection (attempt ${retryCountRef.current})`);

        const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const proxyUrl = urlVariants[0].startsWith('http:') && isHttps
          ? `/api/proxy?url=${encodeURIComponent(urlVariants[0])}`
          : urlVariants[0];

        if (soundRef.current) {
          soundRef.current.unload();
          soundRef.current = new Howl({
            src: [proxyUrl],
            html5: true,
            format: ['mp3', 'aac', 'ogg'],
            volume: isMuted ? 0 : volume,
          });
        }
      }, 2000 * (retryCountRef.current + 1));
    } else {
      setStatus('Failed to connect to stream after multiple attempts.');
    }
  }, [urlVariants, volume, isMuted]);

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      if (soundRef.current) {
        soundRef.current.pause();
        setStatus('Paused');
      }
    } else {
      if (!soundRef.current) {
        console.log('First play - initializing audio');
        initializeAudio();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (streamHealth === 'unhealthy') {
        setStreamHealth('unknown');
        setStatus('Retrying connection...');
      }

      try {
        if (soundRef.current) {
          console.log('Playing audio...');
          soundRef.current.play();
        }
      } catch (err) {
        console.error("Play failed:", err);
        setStatus('Failed to play stream. Click Retry.');
        setStreamHealth('unhealthy');
      }
    }
  }, [isPlaying, streamHealth, initializeAudio]);

  useEffect(() => {
    setLogoError(false);

    return () => {
      console.log('AudioPlayer unmounting - cleaning up resources');
      if (soundRef.current) {
        console.log('Unloading Howler instance');
        soundRef.current.unload();
        soundRef.current = null;
      }
    };
  }, [logoUrl]);

  useEffect(() => {
    console.log('AudioPlayer mounted, fetching metadata for:', streamUrl, 'serverType:', serverType);
    const fetchMetadata = async () => {
      try {
        console.log('Fetching metadata...');
        const data = await fetchStreamMetadata(streamUrl, serverType);
        console.log('Metadata fetched:', data);
        setMetadata(data);
      } catch (error) {
        console.error("Failed to fetch stream metadata:", error);
        setMetadata(prev => ({ ...prev, songTitle: 'Metadata Unavailable' }));
      }
    };

    fetchMetadata();
    const intervalId = setInterval(fetchMetadata, 5000);

    return () => {
      clearInterval(intervalId);
      console.log('AudioPlayer unmounted');
    };
  }, [streamUrl, serverType]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (soundRef.current) {
      soundRef.current.volume(newVolume);
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
        soundRef.current.mute(false);
      }
    }
  };

  const toggleMute = useCallback(() => {
    if (!soundRef.current) return;
    if (isMuted) {
      soundRef.current.mute(false);
      setIsMuted(false);
      setVolume(lastVolume > 0.05 ? lastVolume : 0.5);
      soundRef.current.volume(lastVolume > 0.05 ? lastVolume : 0.5);
    } else {
      setLastVolume(volume);
      soundRef.current.mute(true);
      setIsMuted(true);
      setVolume(0);
    }
  }, [isMuted, volume, lastVolume]);

  const retryConnection = useCallback(() => {
    console.log('Retry connection requested');

    if (soundRef.current) {
      console.log('Unloading existing Howler instance');
      soundRef.current.unload();
      soundRef.current = null;
    }

    setStreamHealth('unknown');
    setStatus('Retrying connection...');
    retryCountRef.current = 0;
    urlVariantIndexRef.current = 0;
    setIsPlaying(false);

    console.log('Connection reset - will initialize on next play');
  }, [effectiveStreamUrl]);

  const handleShare = useCallback(async () => {
    const currentUrl = window.location.href;
    const songTitle = metadata.songTitle !== 'Loading...' && metadata.songTitle !== 'Metadata Unavailable'
      ? metadata.songTitle
      : 'live stream';

    const shareData = {
      title: 'ShoutStream Player',
      text: `Now 🎧 ${songTitle}`,
      url: currentUrl,
    };

    // Check if Web Share API is supported
    if (navigator.share) {
      // Check if canShare exists (not all browsers support it)
      const canShare = navigator.canShare ? navigator.canShare(shareData) : true;

      if (canShare) {
        try {
          await navigator.share(shareData);
          // Share successful - no need to show feedback as the native UI handles it
          return;
        } catch (error: any) {
          // User canceled the share (AbortError) - this is normal behavior
          if (error.name === 'AbortError') {
            console.log('Share canceled by user');
            return;
          }
          // Other errors - fall through to clipboard fallback
          console.log('Share failed:', error);
        }
      }
    }

    // Fallback: copy to clipboard for desktop browsers or if share fails
    const shareText = `${shareData.text} on ${shareData.url}`;
    fallbackShare(shareText);
  }, [metadata.songTitle]);

  const fallbackShare = useCallback((text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        // Show tooltip with success message
        setShareTooltip('Copied!');
        setTimeout(() => {
          setShareTooltip(null);
        }, 3000);
      }).catch(() => {
        // Show tooltip with error message
        setShareTooltip('Failed to copy');
        setTimeout(() => {
          setShareTooltip(null);
        }, 3000);
      });
    }
  }, []);

  return (
    <div className="page-background relative overflow-hidden flex items-center justify-center p-4 sm:p-6">
      <div className={`card p-6 sm:p-8 w-full max-w-md relative z-10 fade-in ${isPlaying ? 'ring-2 ring-ring' : ''}`}>
        <div className="flex flex-col items-center">
          {/* Logo/Album Art */}
          <div className={`
            relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center
            rounded-2xl mb-6 overflow-hidden bg-muted
            transition-all duration-300
            ${isPlaying ? 'scale-105' : 'scale-100'}
            fade-in-delay-1
          `}>
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt="Stream logo"
                className="w-full h-full object-cover"
                onError={() => setLogoError(true)}
              />
            ) : (
              <MusicNoteIcon className="w-20 h-20 sm:w-24 sm:h-24 text-muted-foreground opacity-70" />
            )}
          </div>

          {/* Song Title */}
          <div className="text-center w-full mb-6 fade-in-delay-2">
            <div className="relative h-12 overflow-hidden mb-4">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-marquee whitespace-nowrap">
                  <h2 className="text-2xl sm:text-3xl font-bold px-4" title={metadata.songTitle}>
                    {metadata.songTitle}
                  </h2>
                </div>
              </div>
            </div>

            {/* Status & Listeners */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-2">
                <div className={`status-dot ${
                  streamHealth === 'healthy' ? 'status-dot-healthy' :
                  streamHealth === 'unhealthy' ? 'status-dot-unhealthy' :
                  'status-dot-unknown'
                }`} />
                <span className="text-xs text-muted-foreground">
                  {streamHealth === 'healthy' ? 'Now Playing' :
                   streamHealth === 'unhealthy' ? 'Offline' :
                   'Ready'}
                </span>
              </div>

              {metadata.listeners !== null && (
                <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground">
                  <UserIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{metadata.listeners} listeners</span>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center w-full gap-6 fade-in-delay-3">
            {/* Play Button */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={togglePlayPause}
                className="button button-primary w-16 h-16 sm:w-20 sm:h-20 rounded-full text-foreground shadow-lg hover:scale-105 active:scale-95"
                aria-label={isPlaying ? 'Stop' : 'Play'}
              >
                {isPlaying ? <StopIcon className="w-8 h-8" /> : <PlayIcon className="w-9 h-9 ml-1" />}
              </button>

              {streamHealth === 'unhealthy' && (
                <button
                  onClick={retryConnection}
                  className="button button-secondary px-4 py-2 rounded-full text-sm font-medium"
                  aria-label="Retry connection"
                >
                  Retry
                </button>
              )}
            </div>

            {/* Volume & Share Control */}
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={toggleMute}
                className="button button-ghost p-2 rounded-full"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeOffIcon className="w-5 h-5" /> : <VolumeUpIcon className="w-5 h-5" />}
              </button>
              <div className="slider flex-1 relative">
                <div className="slider-track">
                  <div
                    className="slider-range"
                    style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
                  aria-label="Volume slider"
                />
                <style>{`
                  input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 1.25rem;
                    height: 1.25rem;
                    border-radius: 50%;
                    background: hsl(var(--background));
                    border: 2px solid hsl(var(--primary));
                    cursor: pointer;
                    margin-top: -0.375rem;
                  }
                  input[type="range"]::-moz-range-thumb {
                    width: 1.25rem;
                    height: 1.25rem;
                    border-radius: 50%;
                    background: hsl(var(--background));
                    border: 2px solid hsl(var(--primary));
                    cursor: pointer;
                    border: none;
                  }
                `}</style>
              </div>

              {/* Share Button */}
              <div className="relative">
                <button
                  onClick={handleShare}
                  className="button button-ghost p-2 rounded-full"
                  aria-label="Share player"
                  title="Share this player"
                >
                  <ShareIcon className="w-5 h-5" />
                </button>
                {/* Tooltip */}
                {shareTooltip && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-foreground text-background px-3 py-1.5 rounded-md text-sm font-medium shadow-lg animate-fade-in">
                    {shareTooltip}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
