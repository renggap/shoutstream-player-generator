"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Howl } from 'howler';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon';
import { VolumeUpIcon } from './icons/VolumeUpIcon';
import { VolumeOffIcon } from './icons/VolumeOffIcon';
import { UserIcon } from './icons/UserIcon';
import { ShareIcon } from './icons/ShareIcon';
import { CodeIcon } from './icons/CodeIcon';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { fetchStreamMetadata } from '../utils/metadata';
import { generateStreamUrlVariants } from '../utils/stream-url';

import type { ServerType } from '../services/slug-storage.server';

interface AudioPlayerProps {
  streamUrl: string;
  logoUrl?: string;
  serverType: ServerType;
  slug?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ streamUrl, logoUrl, serverType, slug }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(0.85);
  const [status, setStatus] = useState('Ready');
  const [metadata, setMetadata] = useState<{ songTitle: string; listeners: string | null }>({
    songTitle: 'Live Audio Stream',
    listeners: null
  });
  const [logoError, setLogoError] = useState(false);
  const [streamHealth, setStreamHealth] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown');
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'embed'>('link');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

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
      return `/api/proxy?url=${encodeURIComponent(url)}`;
    }

    return url;
  }, [urlVariants, currentUrlIndex]);

  const initializeAudio = useCallback(() => {
    if (soundRef.current) return;

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContext();
    audioContext.resume().catch((err) => console.error('AudioContext resume failed:', err));

    const sound = new Howl({
      src: [effectiveStreamUrl],
      html5: true,
      format: ['mp3', 'aac', 'ogg'],
      volume: isMuted ? 0 : volume,
      preload: false,
      onplay: () => {
        setIsPlaying(true);
        setStatus('Playing');
        setStreamHealth('healthy');
        retryCountRef.current = 0;
        urlVariantIndexRef.current = 0;
      },
      onpause: () => {
        setIsPlaying(false);
        setStatus('Paused');
      },
      onend: () => {
        setIsPlaying(false);
        setStatus('Ended');
      },
      onstop: () => {
        setIsPlaying(false);
        setStatus('Stopped');
      },
      onloaderror: () => handleStreamError(),
      onplayerror: () => handleStreamError(),
    });

    soundRef.current = sound;
  }, [effectiveStreamUrl, isMuted, volume]);

  const handleStreamError = useCallback(() => {
    setStreamHealth('unhealthy');
    setStatus('Stream connection error');

    if (urlVariantIndexRef.current < urlVariants.length - 1) {
      const nextIndex = urlVariantIndexRef.current + 1;
      urlVariantIndexRef.current = nextIndex;
      const nextUrl = urlVariants[nextIndex];
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const proxyUrl = nextUrl.startsWith('http:') && isHttps
        ? `/api/proxy?url=${encodeURIComponent(nextUrl)}`
        : nextUrl;

      setStatus(`Connecting alternative source...`);
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
        retryCountRef.current += 1;
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
      setStatus('Unable to connect to stream.');
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
        initializeAudio();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (streamHealth === 'unhealthy') {
        setStreamHealth('unknown');
        setStatus('Connecting...');
      }

      try {
        if (soundRef.current) {
          soundRef.current.play();
        }
      } catch (err) {
        setStatus('Failed to play');
        setStreamHealth('unhealthy');
      }
    }
  }, [isPlaying, streamHealth, initializeAudio]);

  useEffect(() => {
    setLogoError(false);
    return () => {
      if (soundRef.current) {
        soundRef.current.unload();
        soundRef.current = null;
      }
    };
  }, [logoUrl]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const data = await fetchStreamMetadata(streamUrl, serverType);
        if (data.songTitle && data.songTitle !== 'Unknown Song') {
          setMetadata(data);
        }
      } catch (error) {
        // Keep initial fallback metadata
      }
    };

    fetchMetadata();
    const intervalId = setInterval(fetchMetadata, 6000);

    return () => clearInterval(intervalId);
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
      const restoreVol = lastVolume > 0.05 ? lastVolume : 0.5;
      setVolume(restoreVol);
      soundRef.current.volume(restoreVol);
    } else {
      setLastVolume(volume);
      soundRef.current.mute(true);
      setIsMuted(true);
      setVolume(0);
    }
  }, [isMuted, volume, lastVolume]);

  const retryConnection = useCallback(() => {
    if (soundRef.current) {
      soundRef.current.unload();
      soundRef.current = null;
    }
    setStreamHealth('unknown');
    setStatus('Retrying...');
    retryCountRef.current = 0;
    urlVariantIndexRef.current = 0;
    setIsPlaying(false);
  }, []);

  const getPlayerUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return '';
  };

  const getEmbedCode = () => {
    const url = getPlayerUrl();
    return `<iframe src="${url}" width="100%" height="420" frameborder="0" allow="autoplay" style="border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden;"></iframe>`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getPlayerUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(getEmbedCode());
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  // Extract Artist and Song Title if formatted as "Artist - Title"
  const titleParts = useMemo(() => {
    if (!metadata.songTitle || metadata.songTitle === 'Loading...') {
      return { artist: '', title: 'Live Broadcast' };
    }
    if (metadata.songTitle.includes(' - ')) {
      const [artist, ...rest] = metadata.songTitle.split(' - ');
      return { artist: artist.trim(), title: rest.join(' - ').trim() };
    }
    return { artist: '', title: metadata.songTitle };
  }, [metadata.songTitle]);

  const displayServerLabel = useMemo(() => {
    switch (serverType) {
      case 'shoutcast-v2': return 'SHOUTCAST V2';
      case 'shoutcast-v1': return 'SHOUTCAST V1';
      case 'icecast': return 'ICECAST';
      default: return 'LIVE STREAM';
    }
  }, [serverType]);

  return (
    <div className="w-full flex items-center justify-center p-4 sm:p-6">
      <div className="card-luxury p-6 sm:p-8 w-full max-w-md relative overflow-hidden transition-all duration-300">
        
        {/* Top Spec & Status Header */}
        <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="tag-badge tag-badge-gold">
              {displayServerLabel}
            </span>
            <span className="tag-badge">
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-3">
            {metadata.listeners !== null && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] font-mono-tech">
                <UserIcon className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>{metadata.listeners}</span>
              </div>
            )}
            
            {/* Status LED */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full transition-all duration-300 ${
                streamHealth === 'healthy' ? 'bg-emerald-500 pulse-dot shadow-[0_0_8px_rgba(16,185,129,0.6)]' :
                streamHealth === 'unhealthy' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' :
                'bg-amber-400 pulse-dot'
              }`} />
              <span className="text-[11px] font-mono-tech uppercase tracking-wider text-[var(--subtle-foreground)]">
                {streamHealth === 'healthy' ? (isPlaying ? 'STREAMING' : 'READY') :
                 streamHealth === 'unhealthy' ? 'OFFLINE' : 'CONNECTING'}
              </span>
            </div>
          </div>
        </div>

        {/* Center Vinyl & Artwork Deck */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            {/* Outer Rim Decorator */}
            <div className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] p-2 shadow-2xl transition-transform duration-500 ease-out ${isPlaying ? 'scale-[1.02] border-[var(--border-accent)]' : ''}`}>
              
              {/* Vinyl Record Visualizer Container */}
              <div className="w-full h-full rounded-xl overflow-hidden relative flex items-center justify-center bg-[#0d0d0f] border border-white/5">
                
                {logoUrl && !logoError ? (
                  <img
                    src={logoUrl}
                    alt="Stream logo"
                    className="w-full h-full object-cover rounded-lg"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  /* Luxury Minimal Turntable Vinyl Graphic */
                  <div className="w-full h-full flex items-center justify-center relative bg-[radial-gradient(circle_at_center,#18181b_0%,#09090b_100%)]">
                    {/* Vinyl Groove Rings */}
                    <div className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full border border-white/10 flex items-center justify-center relative transition-transform ${isPlaying ? 'animate-spin-vinyl' : 'paused-vinyl'}`}>
                      <div className="w-32 h-32 rounded-full border border-white/5 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center bg-gradient-to-tr from-[#121215] to-[#27272a]">
                          {/* Center Champagne Label */}
                          <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center shadow-lg font-serif-luxury font-bold text-sm border border-white/20">
                            SS
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Animated Equalizer Waveform Overlay when Playing */}
                {isPlaying && (
                  <div className="absolute bottom-3 right-3 flex items-end gap-1 px-2.5 py-1.5 rounded-lg bg-black/70 border border-white/10 backdrop-none">
                    <div className="equalizer-bar" />
                    <div className="equalizer-bar" />
                    <div className="equalizer-bar" />
                    <div className="equalizer-bar" />
                    <div className="equalizer-bar" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Track / Station Metadata Typography */}
        <div className="text-center mb-6 px-2">
          {titleParts.artist && (
            <p className="text-xs font-mono-tech uppercase tracking-widest text-[var(--primary)] mb-1">
              {titleParts.artist}
            </p>
          )}
          <h2 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-[var(--foreground)] leading-tight mb-2 truncate" title={titleParts.title}>
            {titleParts.title}
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] font-mono-tech">
            {status}
          </p>
        </div>

        {/* Primary Controls */}
        <div className="flex flex-col items-center gap-5">
          
          {/* Main Play / Pause Tactile Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlayPause}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center shadow-[0_8px_25px_rgba(0,0,0,0.3)] hover:scale-[1.04] active:scale-[0.96] transition-all duration-200 border border-white/20 hover:border-white/40 focus:outline-none"
              aria-label={isPlaying ? 'Pause stream' : 'Play stream'}
            >
              {isPlaying ? (
                <StopIcon className="w-7 h-7 sm:w-8 sm:h-8" />
              ) : (
                <PlayIcon className="w-8 h-8 sm:w-9 sm:h-9 ml-1" />
              )}
            </button>

            {streamHealth === 'unhealthy' && (
              <button
                onClick={retryConnection}
                className="btn-luxury btn-luxury-outline text-xs py-2 px-3 rounded-full"
              >
                Retry
              </button>
            )}
          </div>

          {/* Volume Control Bar */}
          <div className="w-full flex items-center gap-3 pt-2">
            <button
              onClick={toggleMute}
              className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors rounded-lg focus:outline-none"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeOffIcon className="w-4 h-4" /> : <VolumeUpIcon className="w-4 h-4" />}
            </button>

            <div className="flex-1 relative flex items-center group">
              <div className="slider-luxury-track">
                <div
                  className="slider-luxury-fill"
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
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Volume slider"
              />
            </div>

            <span className="text-[11px] font-mono-tech text-[var(--muted-foreground)] w-8 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>

          {/* Share & Embed Bar */}
          <div className="w-full flex items-center justify-between pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => { setShowShareModal(true); setActiveTab('link'); }}
              className="flex items-center gap-2 text-xs font-mono-tech uppercase text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors py-1 px-2 rounded-md"
            >
              <ShareIcon className="w-3.5 h-3.5" />
              <span>Share Link</span>
            </button>

            <button
              onClick={() => { setShowShareModal(true); setActiveTab('embed'); }}
              className="flex items-center gap-2 text-xs font-mono-tech uppercase text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors py-1 px-2 rounded-md"
            >
              <CodeIcon className="w-3.5 h-3.5" />
              <span>Embed Code</span>
            </button>
          </div>
        </div>

      </div>

      {/* Share / Embed Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className="card-luxury p-6 sm:p-8 w-full max-w-lg relative bg-[var(--surface)] border border-[var(--border)] shadow-2xl">
            
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-[var(--border)]">
              <h3 className="text-xl font-serif-luxury font-bold text-[var(--foreground)]">
                Share Studio Player
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg p-1 font-mono-tech"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-[var(--border)] mb-6">
              <button
                onClick={() => setActiveTab('link')}
                className={`py-2 px-4 text-xs font-mono-tech uppercase tracking-wider transition-colors border-b-2 ${
                  activeTab === 'link'
                    ? 'border-[var(--primary)] text-[var(--primary)] font-semibold'
                    : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                Player Link
              </button>
              <button
                onClick={() => setActiveTab('embed')}
                className={`py-2 px-4 text-xs font-mono-tech uppercase tracking-wider transition-colors border-b-2 ${
                  activeTab === 'embed'
                    ? 'border-[var(--primary)] text-[var(--primary)] font-semibold'
                    : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                Website Embed Code
              </button>
            </div>

            {/* Tab 1: Direct Link */}
            {activeTab === 'link' && (
              <div className="space-y-4">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Direct shareable URL for your audio stream player:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getPlayerUrl()}
                    className="input-luxury font-mono-tech text-xs flex-1"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="btn-luxury btn-luxury-primary text-xs py-3 px-4 flex items-center gap-1.5"
                  >
                    {copiedLink ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: HTML Embed Code */}
            {activeTab === 'embed' && (
              <div className="space-y-4">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Paste this iframe snippet into your website or CMS:
                </p>
                <textarea
                  readOnly
                  rows={4}
                  value={getEmbedCode()}
                  className="w-full p-3 font-mono-tech text-xs bg-[var(--surface-elevated)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none resize-none"
                />
                <button
                  onClick={handleCopyEmbed}
                  className="btn-luxury btn-luxury-primary w-full text-xs py-3 flex items-center justify-center gap-2"
                >
                  {copiedEmbed ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                  <span>{copiedEmbed ? 'Embed Snippet Copied!' : 'Copy Embed Code'}</span>
                </button>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-[var(--border)] flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="btn-luxury btn-luxury-ghost text-xs py-2 px-4"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
