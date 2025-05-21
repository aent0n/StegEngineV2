// File overview: Defines the global header component for the Steg'Engine application.
// Includes the application logo, name, and a theme toggle button.
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

interface AppHeaderProps {
  currentTheme: string;
  toggleTheme: () => void;
}

export default function AppHeader({ currentTheme, toggleTheme }: AppHeaderProps) {
  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div style={{ position: 'relative', width: '40px', height: '40px' }} className="rounded-sm bg-primary-foreground/20 p-1">
            <Image 
              src="https://i.ibb.co/6739X3nZ/steglogo.png" 
              alt="Steg'Engine Logo" 
              layout="fill" 
              objectFit="contain" 
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Steg'Engine</h1>
        </Link>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-primary-foreground hover:bg-primary-foreground/10 focus-visible:ring-primary-foreground"
          aria-label={currentTheme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
        >
          {currentTheme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  );
}
