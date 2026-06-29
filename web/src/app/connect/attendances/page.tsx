"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { apiService } from "@/services/apiService";
import { ClipboardCheck, CheckCircle2, XCircle, MinusCircle, AlertCircle, Loader2, UserX, CalendarDays } from "lucide-react";

const MONTH_NAMES = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; badgeVariant: any }> = {
  hadir: {
    label: "Hadir",
    icon: <CheckCircle2 size={16} />,
    color: "text-green-600",
    badgeVariant: "success",
  },
  izin: {
    label: "Izin",
    icon: <MinusCircle size={16} />,
    color: "text-brand",
    badgeVariant: "info",
  },
  sakit: {
    label: "Sakit",
    icon: <AlertCircle size={16} />,
    color: "text-brand",
    badgeVariant: "warning",
  },
  alpa: {
    label: "Alpa",
    icon: <XCircle size={16} />,
    color: "text-red-600",
    badgeVariant: "danger",
  },
};

export default function AttendancesPage() {
  const now = new Date();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [loadingAtt, setLoadingAtt] = useState(false);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await apiService.getAll("/connect/children");
        const list = res.data || [];
        setChildren(list);
        if (list.length > 0) setSelectedChild(list[0]);
      } catch (error) {
        console.error("Gagal mengambil data anak", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    const fetchAttendance = async () => {
      setLoadingAtt(true);
      try {
        const res = await apiService.getAll(
          `/connect/child/${selectedChild.id}/attendance`,
          { month: selectedMonth, year: selectedYear }
        );
        setAttendanceData(res.data);
      } catch (error) {
        console.error("Gagal mengambil kehadiran", error);
      } finally {
        setLoadingAtt(false);
      }
    };
    fetchAttendance();
  }, [selectedChild, selectedMonth, selectedYear]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  const summary = attendanceData?.summary;
  const attendances: any[] = attendanceData?.attendances || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Kehadiran Siswa</h1>
        <p className="text-muted-foreground">
          Pantau rekap kehadiran anak Anda di sekolah.
        </p>
      </div>

      {children.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center gap-4">
          <div className="p-5 rounded-full bg-brand/10 text-brand-light">
            <UserX size={40} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1 tracking-tight font-bold">
              Belum ada anak yang terhubung
            </h3>
            <p className="text-sm text-muted-foreground">
              Hubungi admin sekolah untuk menghubungkan akun Anda.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Filter Bar */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Pilih Anak */}
              {children.length > 1 && (
                <div className="flex gap-2">
                  {children.map((child: any) => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedChild(child)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        selectedChild?.id === child.id
                          ? "bg-brand/100 text-white border-brand shadow-md"
                          : "bg-background text-foreground border-border hover:border-brand"
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                        {child.name?.charAt(0)}
                      </div>
                      {child.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3 ml-auto">
                {/* Bulan */}
                <SearchableSelect
                  value={String(selectedMonth)}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))}
                  placeholder="Pilih Bulan"
                />

                {/* Tahun */}
                <SearchableSelect
                  value={String(selectedYear)}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  options={[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => ({ value: String(y), label: String(y) }))}
                  placeholder="Pilih Tahun"
                />
              </div>
            </div>
          </Card>

          {loadingAtt ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-brand" size={28} />
            </div>
          ) : (
            <>
              {/* Ringkasan Statistik */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Rate */}
                <Card className="p-5 col-span-2 md:col-span-1 border-l-4 border-l-amber-500 flex flex-col items-center justify-center text-center">
                  <p className="text-3xl font-black text-brand">{summary?.rate ?? 0}%</p>
                  <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">Tingkat Hadir</p>
                </Card>

                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <Card key={key} className="p-5 flex flex-col items-center justify-center text-center">
                    <div className={`mb-2 ${cfg.color}`}>{cfg.icon}</div>
                    <p className={`text-2xl font-black ${cfg.color}`}>
                      {summary?.[key] ?? 0}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">
                      {cfg.label}
                    </p>
                  </Card>
                ))}
              </div>

              {/* Tabel Detail */}
              <Card className="overflow-hidden border-border">
                <div className="flex items-center gap-3 px-6 py-4 bg-muted/40 border-b border-border">
                  <CalendarDays size={18} className="text-brand" />
                  <h3 className="font-bold text-foreground tracking-tight">
                    Detail Kehadiran — {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </h3>
                  <span className="ml-auto text-sm text-muted-foreground">
                    {attendances.length} hari tercatat
                  </span>
                </div>

                {attendances.length === 0 ? (
                  <div className="p-12 text-center">
                    <ClipboardCheck size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground italic">
                      Tidak ada data kehadiran untuk periode ini.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {attendances.map((att: any) => {
                      const cfg = STATUS_CONFIG[att.status];
                      return (
                        <div
                          key={att.id}
                          className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`${cfg?.color ?? "text-slate-600"}`}>
                              {cfg?.icon}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {new Date(att.date).toLocaleDateString("id-ID", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {att.note && (
                              <span className="text-xs text-muted-foreground italic truncate max-w-[160px]">
                                {att.note}
                              </span>
                            )}
                            <Badge variant={cfg?.badgeVariant ?? "neutral"}>
                              {cfg?.label ?? att.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
