import { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  testId?: string;
  actions?: ReactNode;
}

export function AdminPageHeader({ title, subtitle, testId = "page-header", actions }: AdminPageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-4">
      <div className="flex-1">
        <h1 
          className="text-3xl font-bold tracking-tight"
          data-testid={`title-${testId}`}
        >
          {title}
        </h1>
        {subtitle && (
          <p 
            className="text-muted-foreground mt-2"
            data-testid={`subtitle-${testId}`}
          >
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <LanguageSwitcher />
      </div>
    </div>
  );
}
