import { BarChart3 } from 'lucide-react';

interface AdminEmptyStateProps {
  icon?: React.ReactNode;
  message?: string;
}

export function AdminEmptyState({ icon, message = 'Waiting for data...' }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-3">
      {icon || <BarChart3 className="h-10 w-10 opacity-30" />}
      <p className="text-sm font-medium opacity-60">{message}</p>
    </div>
  );
}
