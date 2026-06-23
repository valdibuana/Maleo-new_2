"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

interface TeacherTrendPoint {
  month: string;
  rate: number | null;
}

interface TeacherAttendanceTrendChartProps {
  data: TeacherTrendPoint[];
}

export default function TeacherAttendanceTrendChart({
  data
}: TeacherAttendanceTrendChartProps) {
  const safeData = data ?? [];

  if (safeData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center
        text-sm text-muted-foreground">
        Belum ada data trend kehadiran guru.
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
          v == null ? ["Tidak ada data", ""] : [`${v}%`, "Kehadiran Guru"]
        } />
        <Line type="monotone" dataKey="rate" stroke="#1591DC"
          strokeWidth={2.5} connectNulls={false} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
