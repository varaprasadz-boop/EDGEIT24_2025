import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import logoUrl from "@assets/image_1762432763578.png";

interface FooterLink {
  id: string;
  label: string;
  labelAr: string | null;
  url: string;
  section: 'company' | 'legal' | 'support';
  displayOrder: number;
  isExternal: boolean;
  openInNewTab: boolean;
  active: boolean;
}

interface FooterLinksResponse {
  company: FooterLink[];
  legal: FooterLink[];
  support: FooterLink[];
}

export function Footer() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const { data: footerLinks } = useQuery<FooterLinksResponse>({
    queryKey: ['/api/footer-links'],
  });

  const renderSection = (title: string, links: FooterLink[] | undefined, testIdPrefix: string) => {
    if (!links || links.length === 0) return null;

    return (
      <div>
        <h3 className="font-semibold text-base mb-4">{title}</h3>
        <ul className="space-y-2">
          {links.map((link) => {
            const label = isArabic && link.labelAr ? link.labelAr : link.label;
            const LinkComponent = link.isExternal ? 'a' : Link;
            const linkProps = link.isExternal
              ? { href: link.url, target: link.openInNewTab ? '_blank' : undefined, rel: link.openInNewTab ? 'noopener noreferrer' : undefined }
              : { href: link.url };

            return (
              <li key={link.id}>
                <LinkComponent
                  {...linkProps}
                  className="text-sm text-white/60 hover:text-primary transition-colors"
                  data-testid={`link-footer-${testIdPrefix}-${link.id}`}
                >
                  {label}
                </LinkComponent>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <footer className="bg-[#0A0E27] text-white border-t border-border/40">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <img src={logoUrl} alt="EDGEIT24" className="h-10" />
            <p className="text-sm text-white/60">
              {isArabic 
                ? "سوقك الموثوق لخدمات تقنية المعلومات B2B التي تربط الشركات بأفضل مقدمي خدمات تقنية المعلومات"
                : "Your trusted B2B IT marketplace connecting businesses with top-tier IT service providers."}
            </p>
          </div>

          {renderSection(isArabic ? "الشركة" : "Company", footerLinks?.company, "company")}
          {renderSection(isArabic ? "قانوني" : "Legal", footerLinks?.legal, "legal")}
          {renderSection(isArabic ? "الدعم" : "Support", footerLinks?.support, "support")}
        </div>

        <div className="mt-12 pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/60">
            {isArabic ? "© 2024 EDGEIT24. جميع الحقوق محفوظة." : "© 2024 EDGEIT24. All rights reserved."}
          </p>
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
