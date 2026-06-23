"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

interface TrendDataPoint {
  month: string;
  [level: string]: string | number | null;
}

interface AttendanceTrendChartProps {
  data: TrendDataPoint[];
}

const LEVEL_COLORS: Record<string, string> = {
  "7": "#4BB8FA", "8": "#1591DC", "9": "#10b981",
  "10": "#f59e0b", "11": "#f43f5e", "12": "#8b5cf6",
};
const LEVEL_LABELS: Record<string, string> = {
  "7": "VII", "8": "VIII", "9": "IX",
  "10": "X", "11": "XI", "12": "XII",
};

export default function AttendanceTrendChart({
  data
}: AttendanceTrendChartProps) {
  const safeData = data ?? [];

  if (safeData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center
        text-sm text-muted-foreground">
        Belum ada data trend kehadiran.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={safeData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`}
          tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: any) =>
          v == null ? ["Tidak ada data", ""] : [`${v}%`, "Kehadiran"]
        } />
        <Legend formatter={(value) => LEVEL_LABELS[value] || value} />
        {Object.keys(LEVEL_COLORS).map(level => (
          <Line
            key={level}
            type="monotone"
            dataKey={level}
            stroke={LEVEL_COLORS[level]}
            strokeWidth={2}
            connectNulls={false}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
