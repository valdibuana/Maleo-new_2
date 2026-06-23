import React from "react";
import { AlertCircle, LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  message: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Empty state placeholder for lists/tables with no data.
 * Centered message with optional icon, description, and action button.
 */
export function EmptyState({
  icon: Icon = AlertCircle,
  message,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-12 h-12 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
