"use client";

interface ChartSkeletonProps {
  label?: string;
  height?: string; // contoh: "h-64"
}

export function ChartSkeleton({ label = "Memuat grafik...", height = "h-64" }: ChartSkeletonProps) {
  return (
    <div className={`${height} flex flex-col items-center justify-center
      bg-muted/30 rounded-xl animate-pulse`}>
      <div className="h-8 w-8 border-4 border-brand/30 border-t-brand
        rounded-full animate-spin mb-3" />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
