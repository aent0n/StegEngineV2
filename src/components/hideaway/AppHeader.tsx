import { Binary } from 'lucide-react';
import Link from 'next/link';

export default function AppHeader() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Binary size={32} />
          <h1 className="text-2xl font-bold tracking-tight">Hideaway</h1>
        </Link>
        {/* Future navigation items can go here */}
      </div>
    </header>
  );
}
