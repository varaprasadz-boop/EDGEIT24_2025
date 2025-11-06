import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import logoUrl from "@assets/image_1762432763578.png";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-[#0A0E27] backdrop-blur supports-[backdrop-filter]:bg-[#0A0E27]/95">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
          <img src={logoUrl} alt="EDGEIT24" className="h-8 md:h-10" />
        </Link>

        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/" className="text-sm font-medium text-white hover:text-primary transition-colors" data-testid="link-nav-home">
            Home
          </Link>
          <Link href="/browse" className="text-sm font-medium text-white/80 hover:text-primary transition-colors" data-testid="link-nav-browse">
            Browse Services
          </Link>
          <Link href="/how-it-works" className="text-sm font-medium text-white/80 hover:text-primary transition-colors" data-testid="link-nav-how">
            How It Works
          </Link>
          <Link href="/about" className="text-sm font-medium text-white/80 hover:text-primary transition-colors" data-testid="link-nav-about">
            About
          </Link>
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <Button variant="outline" asChild className="border-white/20 text-white hover:bg-white/10" data-testid="button-signin">
            <Link href="/signin">Sign In</Link>
          </Button>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-post-requirement">
            <Link href="/post-requirement">Post Requirement</Link>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          data-testid="button-mobile-menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-[#0A0E27] px-4 py-4" data-testid="mobile-menu">
          <nav className="flex flex-col space-y-4">
            <Link href="/" className="text-sm font-medium text-white hover:text-primary transition-colors">
              Home
            </Link>
            <Link href="/browse" className="text-sm font-medium text-white/80 hover:text-primary transition-colors">
              Browse Services
            </Link>
            <Link href="/how-it-works" className="text-sm font-medium text-white/80 hover:text-primary transition-colors">
              How It Works
            </Link>
            <Link href="/about" className="text-sm font-medium text-white/80 hover:text-primary transition-colors">
              About
            </Link>
            <div className="flex flex-col space-y-2 pt-4 border-t border-border/40">
              <Button variant="outline" asChild className="border-white/20 text-white hover:bg-white/10 w-full">
                <Link href="/signin">Sign In</Link>
              </Button>
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 w-full">
                <Link href="/post-requirement">Post Requirement</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
