
"use client"; // Required for useState and useEffect

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppHeader from '@/components/hideaway/AppHeader';
import AppFooter from '@/components/hideaway/AppFooter';
import { cn } from '@/lib/utils';
import React, { useState, useEffect, useCallback } from 'react';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Metadata is now an object, not a function, as we are client-side for theme
export const metadataObject: Metadata = {
  title: "Steg'Engine - Outil de Stéganographie",
  description: "Votre boîte à outils complète pour les opérations de stéganographie.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [theme, setTheme] = useState<string>('light'); // Default to light

  useEffect(() => {
    const storedTheme = localStorage.getItem('stegengine-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (storedTheme) {
      setTheme(storedTheme);
    } else if (systemPrefersDark) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('stegengine-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('stegengine-theme', 'light');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <title>{String(metadataObject.title)}</title>
        <meta name="description" content={String(metadataObject.description)} />
        {/* Add other meta tags from metadataObject if needed */}
      </head>
      <body className={cn(geistSans.variable, geistMono.variable, "antialiased flex flex-col min-h-screen")}>
        <AppHeader currentTheme={theme} toggleTheme={toggleTheme} />
        <main className="flex-grow container mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
        <AppFooter />
        <Toaster />
      </body>
    </html>
  );
}
