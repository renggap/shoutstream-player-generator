"use client";

import React from 'react';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { useTheme } from './theme-provider';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-6 right-6 p-2 rounded-full bg-apple-gray dark:bg-dm-gray hover:bg-apple-gray-dark dark:hover:bg-dm-gray-light text-apple-text-secondary dark:text-dm-text-secondary hover:text-graphite dark:hover:text-white transition-all animate-scale-subtle"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <MoonIcon className="w-5 h-5" />
      ) : (
        <SunIcon className="w-5 h-5" />
      )}
    </button>
  );
};
