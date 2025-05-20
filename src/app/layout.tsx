import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppHeader from '@/components/hideaway/AppHeader';
import AppFooter from '@/components/hideaway/AppFooter';
import { cn } from '@/lib/utils';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "Steg'Engine - Outil de Stéganographie",
  description: "Votre boîte à outils complète pour les opérations de stéganographie.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={cn(geistSans.variable, geistMono.variable, "antialiased flex flex-col min-h-screen")}>
        <AppHeader />
        <main className="flex-grow container mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
        <AppFooter />
        <Toaster />
      </body>
    </html>
  );
}
