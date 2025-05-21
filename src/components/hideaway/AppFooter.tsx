import Link from 'next/link';

export default function AppFooter() {
  return (
    <footer className="bg-foreground text-background mt-16">
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="text-center">
          <p>&copy; {new Date().getFullYear()} Steg'Engine. Mis en œuvre par <a href="https://github.com/aent0n" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition underline">aent0n</a></p>
          {/* Links retirés selon la demande */}
        </div>
      </div>
    </footer>
  );
}
