export default function AppFooter() {
  return (
    <footer className="bg-secondary text-secondary-foreground py-6 text-center">
      <div className="container mx-auto px-4">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} Steg'Engine. All rights reserved.
        </p>
        <p className="text-xs mt-1">
          Securely conceal your messages.
        </p>
      </div>
    </footer>
  );
}
