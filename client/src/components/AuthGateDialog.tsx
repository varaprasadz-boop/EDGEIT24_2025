import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus } from "lucide-react";

interface AuthGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export function AuthGateDialog({ 
  open, 
  onOpenChange, 
  title,
  description 
}: AuthGateDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-auth-gate">
        <DialogHeader>
          <DialogTitle data-testid="text-auth-gate-title">
            {title || t('authGate.title', { defaultValue: 'Sign In Required' })}
          </DialogTitle>
          <DialogDescription data-testid="text-auth-gate-description">
            {description || t('authGate.description', { defaultValue: 'Please sign in or create an account to connect with consultants and access all features.' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-2">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            asChild
            data-testid="button-auth-gate-register"
          >
            <Link href="/register">
              <UserPlus className="mr-2 h-4 w-4" />
              {t('authGate.register', { defaultValue: 'Create Account' })}
            </Link>
          </Button>
          <Button
            className="w-full sm:w-auto bg-primary text-primary-foreground"
            asChild
            data-testid="button-auth-gate-login"
          >
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" />
              {t('authGate.signIn', { defaultValue: 'Sign In' })}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
