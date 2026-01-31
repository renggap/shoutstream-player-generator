import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon';
import { VolumeUpIcon } from './icons/VolumeUpIcon';
import { VolumeOffIcon } from './icons/VolumeOffIcon';
import { MusicNoteIcon } from './icons/MusicNoteIcon';
import { UserIcon } from './icons/UserIcon';
import { fetchStreamMetadata } from '../utils/metadata';

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
  const [retryCount, setRetryCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Enhanced CORS proxy handling with local proxy
  const effectiveStreamUrl = useMemo(() => {
    const isInsecureStream = streamUrl.startsWith('http:') && window.location.protocol === 'https:';

    if (isInsecureStream) {
      console.log('Insecure stream detected. Using local CORS proxy.');
      return `/api/proxy?url=${encodeURIComponent(streamUrl)}`;
    }

    return streamUrl;
  }, [streamUrl]);

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
        setRetryCount(0);
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
        setRetryCount(0); // Reset retry count on successful play
    };

    const handleError = (e: Event) => {
        const audio = e.target as HTMLAudioElement;
        const error = audio.error;

        let errorMessage = 'Stream error occurred.';

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
              errorMessage = 'Stream source not supported.';
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

        // Auto-retry for network errors
        if (error?.code === MediaError.MEDIA_ERR_NETWORK && retryCount < 3) {
          setTimeout(() => {
            if (audioRef.current) {
              console.log(`Retrying stream connection (attempt ${retryCount + 1})`);
              audioRef.current.load();
            }
          }, 2000 * (retryCount + 1));
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
    <div className="w-full max-w-md bg-white dark:bg-gray-800/50 backdrop-blur-sm shadow-2xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 animate-slide-up">
      <div className="flex flex-col items-center">
        <div className={`relative w-48 h-48 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full mb-6 transition-all duration-500 overflow-hidden ${isPlaying ? 'scale-105 shadow-lg' : 'scale-100'}`}>
          <div className={`absolute inset-0 border-4 border-blue-500/50 rounded-full ${isPlaying ? 'animate-pulse-slow' : ''}`}></div>
          <div className={`absolute inset-2 border-2 border-purple-500/30 rounded-full ${isPlaying ? 'animate-pulse-slow animation-delay-2s' : ''}`}></div>
          
          {logoUrl && !logoError ? (
            <img src={logoUrl} alt="Stream logo" className="w-full h-full object-cover" onError={() => setLogoError(true)} />
          ) : (
            <MusicNoteIcon className="w-24 h-24 text-gray-400 dark:text-gray-500"/>
          )}
        </div>

        <div className="text-center w-full mb-6 min-h-[6rem]">
            <div className="relative w-full h-7 overflow-hidden">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-max animate-marquee whitespace-nowrap">
                        <span className="text-xl font-bold text-gray-800 dark:text-gray-200 mx-4" title={metadata.songTitle}>{metadata.songTitle}</span>
                        <span className="text-xl font-bold text-gray-800 dark:text-gray-200 mx-4" title={metadata.songTitle}>{metadata.songTitle}</span>
                    </div>
                </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">{status}</p>

            {/* Stream Health Indicator */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${
                streamHealth === 'healthy' ? 'bg-green-500' :
                streamHealth === 'unhealthy' ? 'bg-red-500' :
                'bg-yellow-500'
              } ${
                streamHealth === 'unknown' ? 'animate-pulse' : ''
              }`} title={`Stream status: ${streamHealth}`} />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {streamHealth === 'healthy' ? 'Connected' :
                 streamHealth === 'unhealthy' ? 'Disconnected' :
                 'Checking...'}
              </span>
            </div>

            {metadata.listeners !== null && (
                <div className="flex items-center justify-center gap-2 mt-2 text-gray-500 dark:text-gray-400">
                    <UserIcon className="w-4 h-4" />
                    <span>{metadata.listeners} Listeners</span>
                </div>
            )}
        </div>

        <audio ref={audioRef} src={effectiveStreamUrl} preload="none" crossOrigin="anonymous"/>

        <div className="flex items-center justify-center w-full mb-4 gap-3">
            <button
                onClick={togglePlayPause}
                className="w-20 h-20 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-white shadow-lg hover:scale-110 transform transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                aria-label={isPlaying ? 'Stop' : 'Play'}
            >
                {isPlaying ? <StopIcon className="w-8 h-8" /> : <PlayIcon className="w-10 h-10" />}
            </button>

            {/* Retry button for failed streams */}
            {streamHealth === 'unhealthy' && (
                <button
                    onClick={() => {
                        setStreamHealth('unknown');
                        setStatus('Retrying connection...');
                        setRetryCount(0);
                        if (audioRef.current) {
                            audioRef.current.load();
                        }
                    }}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                    aria-label="Retry connection"
                >
                    Retry
                </button>
            )}
        </div>
        
        <div className="flex items-center gap-3 w-full">
            <button onClick={toggleMute} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors" aria-label={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted || volume === 0 ? <VolumeOffIcon className="w-6 h-6" /> : <VolumeUpIcon className="w-6 h-6" />}
            </button>
            <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                aria-label="Volume slider"
            />
        </div>
      </div>
    </div>
  );
};