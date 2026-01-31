import React, { useState, useEffect } from 'react';
import { HomePage } from './components/HomePage';
import { PlayerPage } from './components/PlayerPage';
import { ThemeToggle } from './components/ThemeToggle';
import { useTheme } from './hooks/useTheme';
import { encodePlayerData, decodePlayerData, type PlayerData } from './utils/url';

enum Route {
  Home,
  Player,
}

const App: React.FC = () => {
  const [route, setRoute] = useState<Route>(Route.Home);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/player/')) {
        try {
          const encodedData = hash.substring(9);
          const data = decodePlayerData(encodedData);

          if (data.streamUrl && data.streamUrl.startsWith('http')) {
            setPlayerData(data);
            setRoute(Route.Player);
          } else {
            throw new Error("Invalid stream URL in player data");
          }
        } catch (error) {
          console.error("Failed to decode player data from hash:", error);
          window.location.hash = '';
          setRoute(Route.Home);
        }
      } else {
        setPlayerData(null);
        setRoute(Route.Home);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleGeneratePlayer = (streamUrl: string, logoUrl: string) => {
    const data: PlayerData = { streamUrl };
    if (logoUrl) {
        data.logoUrl = logoUrl;
    }
    const encodedData = encodePlayerData(data);
    window.location.hash = `#/player/${encodedData}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans transition-colors duration-300">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>
      <main className="container mx-auto px-4 py-8">
        {route === Route.Home && <HomePage onGenerate={handleGeneratePlayer} />}
        {route === Route.Player && playerData && (
          <PlayerPage 
            streamUrl={playerData.streamUrl} 
            logoUrl={playerData.logoUrl}
          />
        )}
      </main>
    </div>
  );
};

export default App;