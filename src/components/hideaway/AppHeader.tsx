
import Image from 'next/image';
import Link from 'next/link';

export default function AppHeader() {
  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div style={{ position: 'relative', width: '40px', height: '40px' }} className="rounded-sm bg-primary-foreground/20 p-1">
            <Image 
              src="/logo.png" 
              alt="Steg'Engine Logo" 
              layout="fill" 
              objectFit="contain" 
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Steg'Engine</h1>
        </Link>
        {/* Navigation links from HTML example are not added to keep app single-page focused */}
      </div>
    </header>
  );
}
