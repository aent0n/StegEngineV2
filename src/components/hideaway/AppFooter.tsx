import Link from 'next/link';

export default function AppFooter() {
  return (
    <footer className="bg-foreground text-background mt-16">
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="text-center">
          <p>&copy; {new Date().getFullYear()} Steg'Engine. Mis en œuvre par <a href="https://github.com/aent0n" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition underline">aent0n</a></p>
          <div className="mt-4 space-x-4">
            <Link href="#" className="hover:text-primary transition text-sm">Politique de Confidentialité</Link>
            <Link href="#" className="hover:text-primary transition text-sm">Conditions de Service</Link>
            <Link href="#" className="hover:text-primary transition text-sm">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
