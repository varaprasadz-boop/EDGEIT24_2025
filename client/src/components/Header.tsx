import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, User, LogOut, Settings, LayoutDashboard, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import { useTranslation } from "react-i18next";
import logoUrl from "@assets/image_1762432763578.png";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthContext();
  const { t, i18n } = useTranslation();

  // Initialize RTL direction on mount based on current language
  useEffect(() => {
    const currentLang = i18n.language || 'en';
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
  }, [i18n.language]);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const getUserInitials = () => {
    if (!user) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  const getUserDisplayName = () => {
    if (!user) return "User";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-[#0A0E27] backdrop-blur supports-[backdrop-filter]:bg-[#0A0E27]/95">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
          <img src={logoUrl} alt="EDGEIT24" className="h-8 md:h-10" />
        </Link>

        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/" className="text-sm font-medium text-white hover:text-primary transition-colors" data-testid="link-nav-home">
            {t('navigation.home')}
          </Link>
          {isAuthenticated && (
            <Link href="/dashboard" className="text-sm font-medium text-white hover:text-primary transition-colors" data-testid="link-nav-dashboard">
              {t('navigation.dashboard')}
            </Link>
          )}
          <Link href="/browse" className="text-sm font-medium text-white/80 hover:text-primary transition-colors" data-testid="link-nav-browse">
            {t('navigation.browseServices')}
          </Link>
          <Link href="/how-it-works" className="text-sm font-medium text-white/80 hover:text-primary transition-colors" data-testid="link-nav-how">
            {t('navigation.howItWorks')}
          </Link>
          <Link href="/about" className="text-sm font-medium text-white/80 hover:text-primary transition-colors" data-testid="link-nav-about">
            {t('navigation.about')}
          </Link>
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white" data-testid="button-language-toggle">
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => changeLanguage('en')} data-testid="button-lang-english">
                <span className={i18n.language === 'en' ? 'font-bold' : ''}>English</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('ar')} data-testid="button-lang-arabic">
                <span className={i18n.language === 'ar' ? 'font-bold' : ''}>العربية</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={getUserDisplayName()} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal" data-testid="text-user-info">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild data-testid="button-menu-dashboard">
                  <Link href="/dashboard" className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t('navigation.dashboard')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild data-testid="button-menu-profile">
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    {t('navigation.profile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild data-testid="button-menu-settings">
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    {t('navigation.settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="button-menu-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('navigation.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="outline" asChild className="border-white/20 text-white" data-testid="button-signin">
                <a href="/login">{t('navigation.signIn')}</a>
              </Button>
              <Button asChild className="bg-primary text-primary-foreground" data-testid="button-post-requirement">
                <a href="/login">{t('navigation.postRequirement')}</a>
              </Button>
            </>
          )}
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
            <Link href="/" className="text-sm font-medium text-white hover:text-primary transition-colors" data-testid="link-mobile-home">
              {t('navigation.home')}
            </Link>
            {isAuthenticated && (
              <Link href="/dashboard" className="text-sm font-medium text-white hover:text-primary transition-colors" data-testid="link-mobile-dashboard">
                {t('navigation.dashboard')}
              </Link>
            )}
            <Link href="/browse" className="text-sm font-medium text-white/80 hover:text-primary transition-colors" data-testid="link-mobile-browse">
              {t('navigation.browseServices')}
            </Link>
            <Link href="/how-it-works" className="text-sm font-medium text-white/80 hover:text-primary transition-colors" data-testid="link-mobile-how">
              {t('navigation.howItWorks')}
            </Link>
            <Link href="/about" className="text-sm font-medium text-white/80 hover:text-primary transition-colors" data-testid="link-mobile-about">
              {t('navigation.about')}
            </Link>
            <div className="flex flex-col space-y-2 pt-4 border-t border-border/40">
              {/* Language Switcher in Mobile Menu */}
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center space-x-2 text-white/80">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">{t('navigation.language')}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={i18n.language === 'en' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => changeLanguage('en')}
                    className={i18n.language === 'en' ? '' : 'border-white/20 text-white hover:bg-white/10'}
                    data-testid="button-mobile-lang-en"
                  >
                    EN
                  </Button>
                  <Button
                    variant={i18n.language === 'ar' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => changeLanguage('ar')}
                    className={i18n.language === 'ar' ? '' : 'border-white/20 text-white hover:bg-white/10'}
                    data-testid="button-mobile-lang-ar"
                  >
                    AR
                  </Button>
                </div>
              </div>
              
              {isAuthenticated ? (
                <>
                  <div className="flex items-center space-x-3 px-4 py-2 text-white">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={getUserDisplayName()} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">{getUserDisplayName()}</p>
                      <p className="text-xs text-white/60">{user?.email}</p>
                    </div>
                  </div>
                  <Button variant="outline" asChild className="border-white/20 text-white w-full" data-testid="button-mobile-profile">
                    <Link href="/profile">{t('navigation.profile')}</Link>
                  </Button>
                  <Button variant="outline" className="border-white/20 text-white w-full" onClick={logout} data-testid="button-mobile-logout">
                    {t('navigation.logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" asChild className="border-white/20 text-white w-full" data-testid="button-mobile-signin">
                    <a href="/login">{t('navigation.signIn')}</a>
                  </Button>
                  <Button asChild className="bg-primary text-primary-foreground w-full" data-testid="button-mobile-post-requirement">
                    <a href="/login">{t('navigation.postRequirement')}</a>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
