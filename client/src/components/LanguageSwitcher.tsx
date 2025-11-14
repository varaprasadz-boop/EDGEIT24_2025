import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Language = 'en' | 'ar';

export function LanguageSwitcher() {
  const [language, setLanguage] = useState<Language>(() => {
    // Get saved language from localStorage or default to English
    const saved = localStorage.getItem('language');
    return (saved === 'ar' ? 'ar' : 'en') as Language;
  });

  useEffect(() => {
    // Save language preference
    localStorage.setItem('language', language);
    
    // Update document direction for RTL/LTR
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    // In a real app, this would trigger i18n library to change translations
    // For now, we'll just store the preference
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-language-switcher"
        >
          <Globe className="h-5 w-5" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleLanguageChange('en')}
          className={language === 'en' ? 'bg-accent' : ''}
          data-testid="menu-item-english"
        >
          EN - English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange('ar')}
          className={language === 'ar' ? 'bg-accent' : ''}
          data-testid="menu-item-arabic"
        >
          AR - العربية
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook to get current language
export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'ar' ? 'ar' : 'en') as Language;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('language');
      setLanguage((saved === 'ar' ? 'ar' : 'en') as Language);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return language;
}

// Translation helper (placeholder for future i18n implementation)
export const t = {
  en: {
    dashboard: 'Dashboard',
    users: 'Users',
    categories: 'Categories',
    requirements: 'Requirements',
    bids: 'Bids',
    payments: 'Payments',
    disputes: 'Disputes',
    settings: 'Settings',
    logout: 'Logout',
    totalUsers: 'Total Users',
    totalClients: 'Total Clients',
    totalConsultants: 'Total Service Providers',
    activeRequirements: 'Active Requirements',
    totalBids: 'Total Bids',
    completedProjects: 'Completed Projects',
    totalGMV: 'Total GMV',
    platformOverview: 'Platform Overview',
  },
  ar: {
    dashboard: 'لوحة القيادة',
    users: 'المستخدمون',
    categories: 'الفئات',
    requirements: 'المتطلبات',
    bids: 'العروض',
    payments: 'المدفوعات',
    disputes: 'النزاعات',
    settings: 'الإعدادات',
    logout: 'تسجيل الخروج',
    totalUsers: 'إجمالي المستخدمين',
    totalClients: 'إجمالي العملاء',
    totalConsultants: 'إجمالي مقدمي الخدمات',
    activeRequirements: 'المتطلبات النشطة',
    totalBids: 'إجمالي العروض',
    completedProjects: 'المشاريع المكتملة',
    totalGMV: 'إجمالي قيمة المعاملات',
    platformOverview: 'نظرة عامة على المنصة',
  },
};
