import React, { useState, useEffect } from 'react';
import { AudioPlayer } from './AudioPlayer';


interface PlayerPageProps {
  streamUrl: string;
  logoUrl?: string;
}

export const PlayerPage: React.FC<PlayerPageProps> = ({ streamUrl, logoUrl }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [isShortening, setIsShortening] = useState(true);

  useEffect(() => {
    const shortenUrl = async (longUrl: string) => {
      setIsShortening(true);
      try {
        const spooMeUrl = 'https://spoo.me/';
        const options = {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            url: longUrl,
          }),
        };

        const response = await fetch(spooMeUrl, options);
        if (response.ok) {
          const data = await response.json();
          if (data && data.short_url) {
            setShortUrl(data.short_url);
          } else {
            throw new Error('Invalid response from shortener API');
          }
        } else {
          throw new Error(`Failed to shorten URL, status: ${response.status}`);
        }
      } catch (error) {
        console.error('URL shortening failed, falling back to long URL:', error);
        setShortUrl(window.location.href); // Fallback to the long URL
      } finally {
        setIsShortening(false);
      }
    };

    shortenUrl(window.location.href);
  }, []);

  const handleCopy = () => {
    if (shortUrl) {
      navigator.clipboard.writeText(shortUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };
  
  const shareUrl = shortUrl || window.location.href;
  const shareText = "Listen to this stream!";
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] px-6 animate-fade-in">
      <AudioPlayer streamUrl={streamUrl} logoUrl={logoUrl} />

      {/* Share Section */}
      <div className="flex items-center justify-center gap-6 mt-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <a
          href={isShortening ? '#' : whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-apple-text-secondary dark:text-dm-text-secondary hover:text-royal-blue dark:hover:text-dm-royal-blue font-medium transition-colors ${isShortening ? 'opacity-50' : ''}`}
          aria-disabled={isShortening}
        >
          WhatsApp
        </a>
        <span className="text-apple-border dark:text-dm-gray-light">|</span>
        <a
          href={isShortening ? '#' : telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-apple-text-secondary dark:text-dm-text-secondary hover:text-royal-blue dark:hover:text-dm-royal-blue font-medium transition-colors ${isShortening ? 'opacity-50' : ''}`}
          aria-disabled={isShortening}
        >
          Telegram
        </a>
        <span className="text-apple-border dark:text-dm-gray-light">|</span>
        <button
          onClick={handleCopy}
          disabled={isShortening}
          className={`text-apple-text-secondary dark:text-dm-text-secondary hover:text-royal-blue dark:hover:text-dm-royal-blue font-medium transition-colors disabled:opacity-50 ${isShortening ? 'opacity-50' : ''}`}
        >
          {isShortening ? 'Generating...' : (isCopied ? 'Copied' : 'Copy Link')}
        </button>
      </div>
    </div>
  );
};