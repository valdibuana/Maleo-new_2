import React from "react";
import { Card } from "./Card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  bg?: string;
  colorClass?: string;
  trend?: string;
}

/**
 * Stat card for dashboard and list page summaries.
 * Displays a metric with icon, color accent, and optional trend text.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-brand",
  bg = "bg-brand/10",
  colorClass,
  trend,
}: StatCardProps) {
  const iconColor = colorClass || `${color} ${bg}`;
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColor}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <h3 className="text-2xl font-bold text-foreground tracking-tight">
          {value}
        </h3>
        {trend && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{trend}</p>
        )}
      </div>
    </Card>
  );
}
