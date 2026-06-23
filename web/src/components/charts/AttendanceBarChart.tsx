"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface AttendanceChartDataItem {
  month: string;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
}

interface AttendanceBarChartProps {
  data: AttendanceChartDataItem[];
}

export default function AttendanceBarChart({ data }: AttendanceBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          }}
        />
        <Legend />
        <Bar
          dataKey="hadir"
          fill="#4F46E5"
          name="Hadir"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="izin"
          fill="#F59E0B"
          name="Izin"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="sakit"
          fill="#06B6D4"
          name="Sakit"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="alpa"
          fill="#EF4444"
          name="Alpa"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
