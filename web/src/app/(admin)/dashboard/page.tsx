"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Users,
  GraduationCap,
  School,
  BookOpen,
  TrendingUp,
  Megaphone,
  CalendarDays,
  Loader2
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiService } from "@/services/apiService";
import { ChartSkeleton } from "@/components/charts/ChartSkeleton";

const AttendanceBarChart = dynamic(
  () => import("@/components/charts/AttendanceBarChart"),
  {
    ssr: false,
    loading: () => <ChartSkeleton label="Memuat Grafik Kehadiran..." />,
  }
);

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceChart, setAttendanceChart] = useState<any[]>([]);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await apiService.getAll("/dashboard/summary");
        setSummary(response.data);
        if (response.data?.attendanceChart) {
          setAttendanceChart(response.data.attendanceChart);
        }
      } catch (error) {
        console.error("Gagal mengambil data dashboard", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const statCards = [
    {
      label: "Total Siswa",
      value: summary?.totalStudents ?? 0,
      icon: Users,
      color: "from-brand-light to-brand",
      shadow: "shadow-brand/25",
    },
    {
      label: "Total Guru",
      value: summary?.totalTeachers ?? 0,
      icon: GraduationCap,
      color: "from-brand-light to-brand",
      shadow: "shadow-brand/25",
    },
    {
      label: "Total Kelas",
      value: summary?.totalClasses ?? 0,
      icon: School,
      color: "from-violet-500 to-violet-600",
      shadow: "shadow-violet-500/25",
    },
    {
      label: "Mata Pelajaran",
      value: summary?.totalSubjects ?? 0,
      icon: BookOpen,
      color: "from-brand-light to-brand",
      shadow: "shadow-brand/25",
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p>Sinkronisasi data database...</p>
      </div>
    );
  }

  const announcements = summary?.recentAnnouncements || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Selamat datang di Maleo SIAKAD — Ringkasan informasi akademik
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg ${stat.shadow}`}
                >
                  <Icon size={22} className="text-white" />
                </div>
              </div>
              <div
                className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color}`}
              />
            </Card>
          );
        })}
      </div>

      {/* Charts & Quick Info Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Rekap Kehadiran Bulanan</CardTitle>
            <Badge variant="info">Semester Ganjil {summary?.academicYear}</Badge>
          </CardHeader>
          <div className="h-72">
            <AttendanceBarChart data={attendanceChart} />
          </div>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Statistik Cepat</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-brand/10 border border-brand/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand/100 rounded-lg">
                  <TrendingUp size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Kehadiran
                  </p>
                  <p className="text-xs text-muted-foreground">Rata-rata</p>
                </div>
              </div>
              <span className="text-xl font-bold text-brand">
                {summary?.attendanceRate}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-violet-50 border border-violet-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500 rounded-lg">
                  <CalendarDays size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Tahun Ajaran
                  </p>
                  <p className="text-xs text-muted-foreground">Aktif</p>
                </div>
              </div>
              <span className="text-sm font-bold text-violet-600">
                {summary?.academicYear}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Announcements */}
      <Card>
        <CardHeader>
          <CardTitle>Pengumuman Terbaru</CardTitle>
          <Badge variant="neutral">{announcements.length} aktif</Badge>
        </CardHeader>
        <div className="space-y-3">
          {announcements.length > 0 ? (
            announcements.map((announcement: any) => (
              <div
                key={announcement.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-brand/10 shrink-0">
                  <Megaphone size={18} className="text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {announcement.title}
                    </p>
                    {announcement.priority === "important" && (
                      <Badge variant="warning">Penting</Badge>
                    )}
                    {announcement.priority === "urgent" && (
                      <Badge variant="danger">Urgent</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {announcement.content}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                  {new Date(announcement.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground italic">
              Belum ada pengumuman yang diterbitkan.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
