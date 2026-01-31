import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  const audioRef = useRef<HTMLAudioElement>(null);

  // Generate all possible URL variants for this stream
  const urlVariants = useMemo(() => generateStreamUrlVariants(streamUrl), [streamUrl]);
  const currentUrlIndex = urlVariantIndexRef.current;

  // Enhanced CORS proxy handling with local proxy
  const effectiveStreamUrl = useMemo(() => {
    const url = urlVariants[currentUrlIndex];
    const isInsecureStream = url.startsWith('http:') && window.location.protocol === 'https:';

    if (isInsecureStream) {
      console.log('Insecure stream detected. Using local CORS proxy.');
      return `/api/proxy?url=${encodeURIComponent(url)}`;
    }

    return url;
  }, [urlVariants, currentUrlIndex]);

  // Update audio src when effectiveStreamUrl changes
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      const newSrc = effectiveStreamUrl;

      // Only update if the source actually changed
      if (audio.src !== newSrc) {
        console.log('Updating audio source from', audio.src, 'to', newSrc);
        audio.src = newSrc;
        audio.load(); // Reload the audio element with new source

        // Reset states when URL changes
        setIsPlaying(false);
        setStatus('Loading...');
        setStreamHealth('unknown');
        retryCountRef.current = 0;
      }
    }
  }, [effectiveStreamUrl]);

  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setStatus('Paused');
    } else {
      // Reset health status when starting playback
      if (streamHealth === 'unhealthy') {
        setStreamHealth('unknown');
        setStatus('Retrying connection...');
      }

      if (audioRef.current) {
        try {
          await audioRef.current.play();
          // Health status will be updated by the 'playing' event handler
        } catch (err) {
          console.error("Audio play failed:", err);
          let errorMessage = 'Failed to load audio source.';

          if (streamUrl.startsWith('http:') && window.location.protocol === 'https:') {
            errorMessage += ' Insecure (HTTP) stream detected - using secure proxy.';
          } else {
            errorMessage += ' Please check the stream URL and try again.';
          }

          setStatus(errorMessage);
          setStreamHealth('unhealthy');
        }
      }
    }
  }, [isPlaying, streamUrl, streamHealth]);

  useEffect(() => {
    setLogoError(false);
  }, [logoUrl]);

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
    const intervalId = setInterval(fetchMetadata, 10000);

    return () => clearInterval(intervalId);
  }, [streamUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
        setVolume(audio.volume);
        setIsMuted(audio.muted);
    };
    const handleWaiting = () => {
        setStatus('Buffering...');
        // Keep health status as is - if it was healthy, buffering doesn't mean it's unhealthy
    };

    const handlePlaying = () => {
        setStatus('Playing');
        setStreamHealth('healthy'); // Stream is healthy when actually playing
        retryCountRef.current = 0; // Reset retry count on successful play
        urlVariantIndexRef.current = 0; // Reset URL variant index on success
    };

    const handleError = (e: Event) => {
        const audio = e.target as HTMLAudioElement;
        const error = audio.error;

        let errorMessage = 'Stream error occurred.';

        // Try next URL variant if available
        if (error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED && urlVariantIndexRef.current < urlVariants.length - 1) {
          const nextIndex = urlVariantIndexRef.current + 1;
          urlVariantIndexRef.current = nextIndex;
          const nextUrl = urlVariants[nextIndex];
          console.log(`Current URL variant failed, trying variant ${nextIndex + 1}/${urlVariants.length}:`, nextUrl);

          // Reset audio source to next variant
          const isInsecureNext = nextUrl.startsWith('http:') && window.location.protocol === 'https:';
          audio.src = isInsecureNext ? `/api/proxy?url=${encodeURIComponent(nextUrl)}` : nextUrl;
          audio.load();
          setStatus(`Trying alternative stream path (${nextIndex + 1}/${urlVariants.length})...`);
          setStreamHealth('unknown');
          return;
        }

        if (error) {
          switch (error.code) {
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error - unable to connect to stream.';
              setStreamHealth('unhealthy');
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = 'Stream format not supported.';
              setStreamHealth('unhealthy');
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Stream source not supported. All URL variants failed.';
              setStreamHealth('unhealthy');
              break;
            default:
              errorMessage = 'Unknown audio error occurred.';
              setStreamHealth('unhealthy');
          }
        }

        if (window.location.protocol === 'https:' && streamUrl.startsWith('http:')) {
          errorMessage += ' Using secure proxy for HTTP stream.';
        }

        setStatus(errorMessage);
        setIsPlaying(false);

        // Auto-retry for network errors (only if no more URL variants)
        if (error?.code === MediaError.MEDIA_ERR_NETWORK && urlVariantIndexRef.current >= urlVariants.length - 1 && retryCountRef.current < 3) {
          setTimeout(() => {
            if (audioRef.current) {
              // Reset to first URL variant
              urlVariantIndexRef.current = 0;
              const currentRetry = retryCountRef.current + 1;
              retryCountRef.current = currentRetry;
              console.log(`Retrying stream connection (attempt ${currentRetry})`);

              const isInsecureUrl = urlVariants[0].startsWith('http:') && window.location.protocol === 'https:';
              audioRef.current.src = isInsecureUrl ? `/api/proxy?url=${encodeURIComponent(urlVariants[0])}` : urlVariants[0];
              audioRef.current.load();
            }
          }, 2000 * (retryCountRef.current + 1));
        }
    };

    const handleLoadStart = () => {
        setStatus('Loading...');
        setStreamHealth('unknown'); // Still checking when loading starts
    };

    const handleCanPlay = () => {
        setStatus('Ready to play');
        // Don't change health status here - wait for actual playing event
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [streamUrl]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if(audioRef.current) {
        audioRef.current.volume = newVolume;
        if(newVolume > 0 && isMuted) {
            setIsMuted(false);
            audioRef.current.muted = false;
        }
    }
  };

  const toggleMute = () => {
      if (!audioRef.current) return;
      if (isMuted) {
          audioRef.current.muted = false;
          setIsMuted(false);
          setVolume(lastVolume > 0.05 ? lastVolume : 0.5);
          audioRef.current.volume = lastVolume > 0.05 ? lastVolume : 0.5;
      } else {
          setLastVolume(volume);
          audioRef.current.muted = true;
          setIsMuted(true);
          setVolume(0);
      }
  };

  return (
    <div className="card-elevated max-w-md mx-auto">
      <div className="flex flex-col items-center">
        {/* Logo/Icon Area - Enhanced */}
        <div className={`relative w-36 h-36 flex items-center justify-center bg-apple-gray dark:bg-dm-gray rounded-3xl mb-8 transition-all duration-500 overflow-hidden shadow-inner ${isPlaying ? 'scale-105 shadow-xl' : 'scale-100'}`}>
          {logoUrl && !logoError ? (
            <img src={logoUrl} alt="Stream logo" className="w-full h-full object-cover" onError={() => setLogoError(true)} />
          ) : (
            <MusicNoteIcon className="w-16 h-16 text-apple-text-secondary dark:text-dm-text-secondary"/>
          )}
        </div>

        {/* Metadata Display - Improved */}
        <div className="text-center w-full mb-8">
            <div className="relative w-full h-8 overflow-hidden mb-3">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-max animate-marquee whitespace-nowrap">
                        <span className="text-xl font-bold text-graphite dark:text-white mx-4" title={metadata.songTitle}>{metadata.songTitle}</span>
                        <span className="text-xl font-bold text-graphite dark:text-white mx-4" title={metadata.songTitle}>{metadata.songTitle}</span>
                    </div>
                </div>
            </div>

            {/* Status & Health - Better styled */}
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
                        <span className="text-xs">{metadata.listeners} listening</span>
                    </div>
                )}
            </div>
        </div>

        <audio ref={audioRef} src={effectiveStreamUrl} preload="none" crossOrigin="anonymous"/>

        {/* Controls - Enhanced layout */}
        <div className="flex flex-col items-center w-full gap-6">
            {/* Play Button - Improved */}
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
                        onClick={() => {
                            setStreamHealth('unknown');
                            setStatus('Retrying connection...');
                            retryCountRef.current = 0;
                            if (audioRef.current) {
                                audioRef.current.load();
                            }
                        }}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-sm font-medium transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-md"
                        aria-label="Retry connection"
                    >
                        Retry
                    </button>
                )}
            </div>

            {/* Volume Control - Enhanced */}
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
