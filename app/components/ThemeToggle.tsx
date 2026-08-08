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
      className="btn-luxury-ghost p-2.5 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all duration-200"
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
    >
      {theme === 'light' ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
    </button>
  );
};
