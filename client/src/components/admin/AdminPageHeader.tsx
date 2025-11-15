interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex items-center justify-between" data-testid="admin-page-header">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-2" data-testid="page-description">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2" data-testid="page-actions">
          {actions}
        </div>
      )}
    </div>
  );
}
