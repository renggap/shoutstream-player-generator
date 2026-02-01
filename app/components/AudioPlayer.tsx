import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Howl, Howler } from 'howler';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon';
import { VolumeUpIcon } from './icons/VolumeUpIcon';
import { VolumeOffIcon } from './icons/VolumeOffIcon';
import { MusicNoteIcon } from './icons/MusicNoteIcon';
import { UserIcon } from './icons/UserIcon';
import { fetchStreamMetadata } from '../utils/metadata';
import { generateStreamUrlVariants } from '../utils/stream-url';

interface AudioPlayerProps {
  streamUrl: string;
  logoUrl?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ streamUrl, logoUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(1);
  const [status, setStatus] = useState('Ready');
  const [metadata, setMetadata] = useState<{ songTitle: string; listeners: string | null }>({ songTitle: 'Loading...', listeners: null });
  const [logoError, setLogoError] = useState(false);
  const [streamHealth, setStreamHealth] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown');
  const retryCountRef = useRef(0);
  const urlVariantIndexRef = useRef(0);
  const soundRef = useRef<Howl | null>(null);

  // Generate all possible URL variants for this stream
  const urlVariants = useMemo(() => generateStreamUrlVariants(streamUrl), [streamUrl]);
  const currentUrlIndex = urlVariantIndexRef.current;

  // Enhanced CORS proxy handling with local proxy
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

  // Initialize Howler instance
  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.unload();
    }

    const sound = new Howl({
      src: [effectiveStreamUrl],
      html5: true, // Use HTML5 Audio for better streaming support
      format: ['mp3', 'aac', 'ogg'],
      volume: volume,
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
      onloaderror: (id, error) => {
        console.error('Howler load error:', error);
        handleStreamError();
      },
      onplayerror: (id, error) => {
        console.error('Howler play error:', error);
        handleStreamError();
      },
    });

    soundRef.current = sound;

    return () => {
      sound.unload();
    };
  }, [effectiveStreamUrl]);

  const handleStreamError = useCallback(() => {
    setStreamHealth('unhealthy');
    setStatus('Stream error - trying alternative...');

    // Try next URL variant if available
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

    // Auto-retry
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
    if (!soundRef.current) return;

    if (isPlaying) {
      soundRef.current.pause();
      setStatus('Paused');
    } else {
      if (streamHealth === 'unhealthy') {
        setStreamHealth('unknown');
        setStatus('Retrying connection...');
      }

      try {
        soundRef.current.play();
      } catch (err) {
        console.error("Play failed:", err);
        setStatus('Failed to play stream. Click Retry.');
        setStreamHealth('unhealthy');
      }
    }
  }, [isPlaying, streamHealth]);

  useEffect(() => {
    setLogoError(false);
  }, [logoUrl]);

  // Fetch metadata periodically
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const data = await fetchStreamMetadata(streamUrl);
        setMetadata(data);
      } catch (error) {
        console.error("Failed to fetch stream metadata:", error);
        setMetadata(prev => ({ ...prev, songTitle: 'Metadata Unavailable' }));
      }
    };

    fetchMetadata();
    const intervalId = setInterval(fetchMetadata, 5000); // Update every 5 seconds

    return () => clearInterval(intervalId);
  }, [streamUrl]);

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
    setStreamHealth('unknown');
    setStatus('Retrying connection...');
    retryCountRef.current = 0;
    urlVariantIndexRef.current = 0;

    if (soundRef.current) {
      soundRef.current.unload();
      soundRef.current = new Howl({
        src: [effectiveStreamUrl],
        html5: true,
        format: ['mp3', 'aac', 'ogg'],
        volume: isMuted ? 0 : volume,
      });
    }
  }, [effectiveStreamUrl, isMuted, volume]);

  return (
    <div className="card-elevated max-w-md mx-auto">
      <div className="flex flex-col items-center">
        {/* Logo/Icon Area */}
        <div className={`relative w-36 h-36 flex items-center justify-center bg-apple-gray dark:bg-dm-gray rounded-3xl mb-8 transition-all duration-500 overflow-hidden shadow-inner ${isPlaying ? 'scale-105 shadow-xl' : 'scale-100'}`}>
          {logoUrl && !logoError ? (
            <img src={logoUrl} alt="Stream logo" className="w-full h-full object-cover" onError={() => setLogoError(true)} />
          ) : (
            <MusicNoteIcon className="w-16 h-16 text-apple-text-secondary dark:text-dm-text-secondary"/>
          )}
        </div>

        {/* Metadata Display */}
        <div className="text-center w-full mb-8">
          <div className="relative w-full h-8 overflow-hidden mb-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-max animate-marquee whitespace-nowrap">
                <span className="text-xl font-bold text-graphite dark:text-white mx-4" title={metadata.songTitle}>{metadata.songTitle}</span>
                <span className="text-xl font-bold text-graphite dark:text-white mx-4" title={metadata.songTitle}>{metadata.songTitle}</span>
              </div>
            </div>
          </div>

          {/* Status & Health */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-apple-text-secondary dark:text-dm-text-secondary font-medium">{status}</p>

            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                streamHealth === 'healthy' ? 'bg-green-500' :
                streamHealth === 'unhealthy' ? 'bg-red-500' :
                'bg-yellow-500'
              } ${
                streamHealth === 'unknown' ? 'animate-pulse' : ''
              }`} title={`Stream status: ${streamHealth}`} />
              <span className="text-xs text-apple-text-secondary dark:text-dm-text-secondary">
                {streamHealth === 'healthy' ? 'Connected' :
                 streamHealth === 'unhealthy' ? 'Disconnected' :
                 'Checking...'}
              </span>
            </div>

            {metadata.listeners !== null && (
              <div className="flex items-center justify-center gap-1.5 mt-1 text-apple-text-secondary dark:text-dm-text-secondary">
                <UserIcon className="w-3.5 h-3.5" />
                <span className="text-xs">{metadata.listeners !== null ? `${metadata.listeners} total listeners` : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center w-full gap-6">
          {/* Play Button */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={togglePlayPause}
              className="w-20 h-20 flex items-center justify-center bg-royal-blue dark:bg-dm-royal-blue rounded-full text-white shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-royal-blue/50"
              aria-label={isPlaying ? 'Stop' : 'Play'}
            >
              {isPlaying ? <StopIcon className="w-8 h-8" /> : <PlayIcon className="w-9 h-9 ml-1" />}
            </button>

            {/* Retry button for failed streams */}
            {streamHealth === 'unhealthy' && (
              <button
                onClick={retryConnection}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-sm font-medium transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-md"
                aria-label="Retry connection"
              >
                Retry
              </button>
            )}
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3 w-full px-4">
            <button
              onClick={toggleMute}
              className="text-apple-text-secondary dark:text-dm-text-secondary hover:text-graphite dark:hover:text-white transition-colors p-1 rounded-full hover:bg-apple-gray dark:hover:bg-dm-gray"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeOffIcon className="w-5 h-5" /> : <VolumeUpIcon className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="flex-1 h-2 bg-apple-gray-dark dark:bg-dm-gray-light rounded-full appearance-none cursor-pointer accent-royal-blue hover:accent-royal-blue-light dark:hover:accent-dm-royal-blue transition-all"
              aria-label="Volume slider"
              style={{
                background: `linear-gradient(to right, rgb(0 122 255) 0%, rgb(0 122 255) ${(isMuted ? 0 : volume) * 100}%, rgb(229 229 234) ${(isMuted ? 0 : volume) * 100}%, rgb(229 229 234) 100%)`
              } as any}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
