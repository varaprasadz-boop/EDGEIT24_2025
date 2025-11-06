import { Link } from "wouter";
import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import logoUrl from "@assets/image_1762432763578.png";

export function Footer() {
  return (
    <footer className="bg-[#0A0E27] text-white border-t border-border/40">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <img src={logoUrl} alt="EDGEIT24" className="h-10" />
            <p className="text-sm text-white/60">
              Your trusted B2B IT marketplace connecting businesses with top-tier IT service providers.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-4">For Clients</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/post-requirement" className="text-sm text-white/60 hover:text-primary transition-colors" data-testid="link-footer-post">
                  Post Requirement
                </Link>
              </li>
              <li>
                <Link href="/browse-vendors" className="text-sm text-white/60 hover:text-primary transition-colors" data-testid="link-footer-browse-vendors">
                  Browse Vendors
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-sm text-white/60 hover:text-primary transition-colors" data-testid="link-footer-how-clients">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-4">For Vendors</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/browse-jobs" className="text-sm text-white/60 hover:text-primary transition-colors" data-testid="link-footer-browse-jobs">
                  Browse Requirements
                </Link>
              </li>
              <li>
                <Link href="/create-profile" className="text-sm text-white/60 hover:text-primary transition-colors" data-testid="link-footer-create-profile">
                  Create Profile
                </Link>
              </li>
              <li>
                <Link href="/vendor-guide" className="text-sm text-white/60 hover:text-primary transition-colors" data-testid="link-footer-vendor-guide">
                  Vendor Guide
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-white/60 hover:text-primary transition-colors" data-testid="link-footer-about">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-white/60 hover:text-primary transition-colors" data-testid="link-footer-contact">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-sm text-white/60 hover:text-primary transition-colors" data-testid="link-footer-help">
                  Help Center
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/60">
            © 2024 EDGEIT24. All rights reserved.
          </p>
          <div className="flex items-center space-x-4">
            <Link href="/privacy" className="text-sm text-white/60 hover:text-primary transition-colors" data-testid="link-footer-privacy">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-white/60 hover:text-primary transition-colors" data-testid="link-footer-terms">
              Terms of Service
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <a href="#" className="text-white/60 hover:text-primary transition-colors" data-testid="link-social-facebook">
              <Facebook className="h-5 w-5" />
            </a>
            <a href="#" className="text-white/60 hover:text-primary transition-colors" data-testid="link-social-twitter">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-white/60 hover:text-primary transition-colors" data-testid="link-social-linkedin">
              <Linkedin className="h-5 w-5" />
            </a>
            <a href="#" className="text-white/60 hover:text-primary transition-colors" data-testid="link-social-instagram">
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
