"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardCheck,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { apiService } from "@/services/apiService";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  hadir: { label: "Hadir", color: "text-brand", bgColor: "bg-brand/10 border-brand/20", icon: CheckCircle2 },
  izin: { label: "Izin", color: "text-brand", bgColor: "bg-brand/10 border-brand/20", icon: Clock },
  sakit: { label: "Sakit", color: "text-brand", bgColor: "bg-brand/10 border-brand/20", icon: AlertCircle },
  alpa: { label: "Alpa", color: "text-rose-700", bgColor: "bg-rose-100 border-rose-200", icon: XCircle },
};

export default function AttendancePage() {
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setIsTeacher(parsed.role === "teacher");
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!isTeacher) {
      fetchAttendanceSummary();
    } else {
      setLoading(false);
    }
  }, [isTeacher, selectedMonth, selectedYear]);

  const fetchAttendanceSummary = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAll("/hub/attendance-summary", {
        month: selectedMonth,
        year: selectedYear,
      });
      setData(res.data);
    } catch (e) {
      console.error("Gagal mengambil data kehadiran:", e);
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    const now = new Date();
    if (selectedYear > now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth >= now.getMonth() + 1)) return;
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const isCurrentMonth = selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear();

  // === TEACHER VIEW ===
  if (isTeacher) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Kehadiran Siswa"
          subtitle="Gunakan menu Input Absensi di sidebar untuk mencatat kehadiran siswa."
        />
        <Card className="p-12 text-center border-dashed border-2 border-muted">
          <ClipboardCheck size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2 tracking-tight font-bold">Fitur Tersedia di Menu Lain</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Untuk mencatat kehadiran siswa, gunakan menu <strong>Input Absensi</strong> pada sidebar.
            Rekap data kehadiran tersedia di menu administrasi.
          </p>
        </Card>
      </div>
    );
  }

  // === STUDENT VIEW ===
  return (
    <div className="space-y-6">
      {/* Header + Month Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Kehadiran Saya</h1>
          <p className="text-sm text-muted-foreground mt-1">Rekap kehadiran Anda setiap bulan</p>
        </div>
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2 shadow-sm">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="font-bold text-base min-w-[140px] text-center">
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="animate-spin mb-3 text-brand" size={36} />
          <p className="animate-pulse">Memuat data kehadiran...</p>
        </div>
      ) : !data ? (
        <Card className="p-12 text-center">
          <AlertCircle size={40} className="mx-auto text-rose-400 mb-3" />
          <p className="font-semibold text-foreground">Gagal memuat data</p>
          <Button className="mt-4" onClick={fetchAttendanceSummary}>Coba Lagi</Button>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(["hadir", "izin", "sakit", "alpa"] as const).map(status => {
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              const count = data.summary[status] || 0;
              return (
                <Card key={status} className={cn("p-5 border", cfg.bgColor)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={cn("text-xs font-bold uppercase tracking-wider", cfg.color)}>{cfg.label}</p>
                      <p className={cn("text-4xl font-black mt-1", cfg.color)}>{count}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">hari</p>
                    </div>
                    <Icon size={24} className={cfg.color} />
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Attendance Rate */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-brand" />
                <h3 className="font-bold text-foreground tracking-tight">Persentase Kehadiran Bulan Ini</h3>
              </div>
              <span className={cn(
                "text-2xl font-black",
                data.presentRate >= 80 ? "text-brand" :
                data.presentRate >= 60 ? "text-brand" : "text-rose-600"
              )}>
                {data.presentRate}%
              </span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  data.presentRate >= 80 ? "bg-brand/100" :
                  data.presentRate >= 60 ? "bg-brand/100" : "bg-rose-500"
                )}
                style={{ width: `${data.presentRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>0%</span>
              <span className={cn(
                "font-medium",
                data.presentRate >= 80 ? "text-brand" : data.presentRate >= 60 ? "text-brand" : "text-rose-600"
              )}>
                {data.presentRate >= 80 ? "✅ Kehadiran Baik" : data.presentRate >= 60 ? "⚠️ Perlu Ditingkatkan" : "❌ Kehadiran Rendah"}
              </span>
              <span>100%</span>
            </div>
          </Card>

          {/* Detail Table */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-border flex items-center gap-2">
              <Calendar size={18} className="text-brand" />
              <h3 className="font-bold text-foreground tracking-tight">Riwayat Kehadiran — {MONTHS[selectedMonth - 1]} {selectedYear}</h3>
              <span className="ml-auto text-sm text-muted-foreground">{data.records?.length || 0} catatan</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Tanggal</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Hari</th>
                    <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records?.length > 0 ? (
                    data.records.map((record: any) => {
                      const d = new Date(record.date);
                      const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.hadir;
                      const Icon = cfg.icon;
                      return (
                        <tr key={record.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-medium">
                            {d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {d.toLocaleDateString("id-ID", { weekday: "long" })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border",
                              cfg.bgColor, cfg.color
                            )}>
                              <Icon size={12} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">
                            {record.note || "-"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-16 text-center">
                        <ClipboardCheck size={40} className="mx-auto text-muted-foreground/20 mb-3" />
                        <p className="font-medium text-foreground">Tidak ada catatan kehadiran</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Belum ada data kehadiran untuk bulan {MONTHS[selectedMonth - 1]} {selectedYear}.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
