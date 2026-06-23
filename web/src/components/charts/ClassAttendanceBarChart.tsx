"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";

interface ClassAttendanceData {
  className: string;
  rate: number;
}

interface ClassAttendanceBarChartProps {
  data: ClassAttendanceData[];
}

export default function ClassAttendanceBarChart({
  data
}: ClassAttendanceBarChartProps) {
  const safeData = data ?? [];

  if (safeData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center
        text-sm text-muted-foreground">
        Belum ada data kehadiran bulan ini.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={safeData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
        <XAxis dataKey="className" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`}
          tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: any) => [`${v}%`, "Kehadiran"]} />
        <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
          {safeData.map((entry, i) => (
            <Cell key={i}
              fill={entry.rate >= 80 ? "#10b981" :
                    entry.rate >= 60 ? "#f59e0b" : "#f43f5e"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
