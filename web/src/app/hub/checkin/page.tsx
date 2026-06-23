"use client";
import React, { useState, useEffect, useCallback } from "react";
import { apiService } from "@/services/apiService";
import { Card } from "@/components/ui/Card";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  CalendarDays,
  Timer,
  LogIn,
  TrendingUp,
  AlertTriangle,
  XCircle,
  UserCheck,
  Briefcase,
  Info,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────
interface MonthlySummary {
  present: number;
  late: number;
  absent: number;
  permission: number;
  sick: number;
}

interface AttendanceData {
  id: number;
  status: string;
  checkinAt: string | null;
  isLate: boolean;
  lateMinutes: number | null;
  note: string | null;
}

interface TodayStatus {
  hasCheckedIn: boolean;
  attendance: AttendanceData | null;
  isWindowOpen: boolean;
  windowMessage?: string;
  currentTime: string;
  hasScheduleToday: boolean;
  warningMessage: string | null;
  workStartTime: string;
  message: string;
  monthlySummary: MonthlySummary;
}

// ── Status Badge Config ──────────────────────────────
type StatusTier = 'hadir' | 'terlambat' | 'sangat_terlambat' | 'izin' | 'sakit' | 'belum';

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  glowColor: string;
}

const STATUS_CONFIG: Record<StatusTier, StatusConfig> = {
  hadir: {
    label: "HADIR TEPAT WAKTU",
    color: "text-brand",
    bgColor: "bg-brand/10",
    borderColor: "border-brand/20",
    icon: CheckCircle,
    glowColor: "shadow-emerald-100",
  },
  terlambat: {
    label: "TERLAMBAT",
    color: "text-brand",
    bgColor: "bg-brand/10",
    borderColor: "border-brand/20",
    icon: AlertTriangle,
    glowColor: "shadow-amber-100",
  },
  sangat_terlambat: {
    label: "SANGAT TERLAMBAT",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    icon: XCircle,
    glowColor: "shadow-rose-100",
  },
  izin: {
    label: "IZIN",
    color: "text-brand",
    bgColor: "bg-brand/10",
    borderColor: "border-brand/20",
    icon: Info,
    glowColor: "shadow-blue-100",
  },
  sakit: {
    label: "SAKIT",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    icon: AlertCircle,
    glowColor: "shadow-yellow-100",
  },
  belum: {
    label: "BELUM CHECK-IN",
    color: "text-slate-500",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    icon: Clock,
    glowColor: "shadow-slate-100",
  },
};

const VERY_LATE_THRESHOLD = 120; // menit

function getStatusTier(attendance: AttendanceData | null): StatusTier {
  if (!attendance) return "belum";
  const { status, lateMinutes } = attendance;
  if (status === "hadir") return "hadir";
  if (status === "terlambat") {
    return (lateMinutes || 0) > VERY_LATE_THRESHOLD ? "sangat_terlambat" : "terlambat";
  }
  if (status === "izin") return "izin";
  if (status === "sakit") return "sakit";
  return "belum";
}

// ── Badge Component ──────────────────────────────────
function StatusBadge({ tier }: { tier: StatusTier }) {
  const cfg = STATUS_CONFIG[tier];
  const Icon = cfg.icon;

  const badgeColorMap: Record<StatusTier, string> = {
    hadir: "bg-brand/100 text-white",
    terlambat: "bg-brand/100 text-white",
    sangat_terlambat: "bg-rose-500 text-white",
    izin: "bg-brand/100 text-white",
    sakit: "bg-yellow-500 text-black",
    belum: "bg-slate-400 text-white",
  };

  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold tracking-wide ${badgeColorMap[tier]} shadow-md`}>
      <Icon size={16} />
      {cfg.label}
    </span>
  );
}

// ── Realtime Clock Hook ──────────────────────────────
function useRealtimeClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeStr = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return { now, dateStr, timeStr };
}

// ── Main Page ────────────────────────────────────────
export default function TeacherCheckinPage() {
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ status: "hadir", note: "" });
  const { dateStr, timeStr } = useRealtimeClock();

  const fetchTodayStatus = useCallback(async () => {
    try {
      const res = await apiService.getAll("/teacher-attendances/today");
      setTodayStatus(res.data);
    } catch (error) {
      console.error("Gagal mengambil status kehadiran:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayStatus();
    const interval = setInterval(fetchTodayStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchTodayStatus]);

  const handleCheckin = async () => {
    if (form.status !== "hadir" && !form.note) {
      alert("Keterangan wajib diisi untuk Izin/Sakit");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiService.create("/teacher-attendances/checkin", form);
      fetchTodayStatus();
    } catch (error: any) {
      alert(error.response?.data?.message || "Gagal check-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading State ──
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded-lg w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-48 bg-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (!todayStatus) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="p-8 text-center border-rose-200 bg-rose-50/50">
          <AlertCircle size={40} className="mx-auto text-rose-400 mb-3" />
          <h2 className="text-lg font-bold text-rose-800 tracking-tight">Gagal Memuat Status Kehadiran</h2>
          <p className="text-sm text-rose-600 mt-1">
            Pastikan data guru Anda valid atau muat ulang halaman.
          </p>
          <button
            onClick={() => { setLoading(true); fetchTodayStatus(); }}
            className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium"
          >
            Coba Lagi
          </button>
        </Card>
      </div>
    );
  }

  const {
    hasCheckedIn,
    attendance,
    isWindowOpen,
    windowMessage,
    hasScheduleToday,
    warningMessage,
    workStartTime,
    message,
    monthlySummary,
  } = todayStatus;

  const statusTier = getStatusTier(attendance);
  const statusCfg = STATUS_CONFIG[statusTier];
  const StatusIcon = statusCfg.icon;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Header: Title + Realtime Clock ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Kehadiran Hari Ini
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <CalendarDays size={14} className="text-brand" />
            {dateStr}
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-brand/20 px-5 py-2.5 rounded-xl shadow-sm">
          <Clock size={18} className="text-brand animate-pulse" />
          <span className="font-mono text-lg font-bold text-brand tabular-nums">
            {timeStr}
          </span>
          <span className="text-xs text-brand-light font-medium">WIB</span>
        </div>
      </div>

      {/* ── Warning: Tidak ada jadwal ── */}
      {!hasScheduleToday && !hasCheckedIn && warningMessage && (
        <div className="p-4 bg-brand/10 border border-brand/20 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertCircle size={18} className="text-brand shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-brand">
              Tidak ada jadwal mengajar hari ini
            </p>
            <p className="text-xs text-brand mt-0.5">
              Anda tetap bisa melakukan check-in untuk mencatat kehadiran di sekolah.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ── SUDAH CHECK-IN ── */}
      {/* ═══════════════════════════════════════════════ */}
      {hasCheckedIn && attendance ? (
        <>
          {/* Attendance Detail Card */}
          <Card
            className={`border ${statusCfg.borderColor} ${statusCfg.bgColor}/30 shadow-lg ${statusCfg.glowColor} overflow-hidden`}
            padding={false}
          >
            {/* Top accent bar */}
            <div
              className={`h-1.5 w-full ${
                statusTier === "hadir"
                  ? "bg-gradient-to-r from-brand-light to-brand"
                  : statusTier === "terlambat"
                  ? "bg-gradient-to-r from-brand-light to-brand"
                  : statusTier === "sangat_terlambat"
                  ? "bg-gradient-to-r from-rose-400 to-rose-600"
                  : statusTier === "izin"
                  ? "bg-gradient-to-r from-brand-light to-brand"
                  : statusTier === "sakit"
                  ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                  : "bg-gradient-to-r from-slate-300 to-slate-500"
              }`}
            />

            <div className="p-6 sm:p-8">
              {/* Status section */}
              <div className="flex flex-col items-center text-center space-y-4 mb-8">
                <div
                  className={`h-16 w-16 rounded-2xl ${statusCfg.bgColor} border ${statusCfg.borderColor} flex items-center justify-center shadow-sm`}
                >
                  <StatusIcon size={32} className={statusCfg.color} />
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Status Kehadiran
                  </p>
                  <StatusBadge tier={statusTier} />
                </div>

                {/* Friendly message */}
                <p className={`text-sm ${statusCfg.color} font-medium max-w-md`}>
                  {message}
                </p>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Jam Kerja Mulai */}
                <div className="bg-white/80 rounded-xl border border-slate-100 p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <Briefcase size={14} className="text-slate-400" />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Jam Kerja
                    </p>
                  </div>
                  <p className="text-2xl font-black text-slate-800">
                    {workStartTime || "07:00"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">WIB</p>
                </div>

                {/* Check-in Time */}
                <div className="bg-white/80 rounded-xl border border-slate-100 p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <LogIn size={14} className="text-brand-light" />
                    <p className="text-xs font-semibold text-brand-light uppercase tracking-wider">
                      Check-In
                    </p>
                  </div>
                  <p className="text-2xl font-black text-brand">
                    {attendance.checkinAt
                      ? new Date(attendance.checkinAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </p>
                  <p className="text-xs text-brand-light mt-0.5">WIB</p>
                </div>

                {/* Late Duration (only when late) */}
                {attendance.isLate && attendance.lateMinutes ? (
                  <div
                    className={`${
                      (attendance.lateMinutes || 0) > VERY_LATE_THRESHOLD
                        ? "bg-rose-50 border-rose-100"
                        : "bg-brand/10 border-brand/20"
                    } rounded-xl border p-4 text-center shadow-sm hover:shadow-md transition-shadow col-span-2 sm:col-span-1`}
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <Timer
                        size={14}
                        className={
                          (attendance.lateMinutes || 0) > VERY_LATE_THRESHOLD
                            ? "text-rose-400"
                            : "text-brand-light"
                        }
                      />
                      <p
                        className={`text-xs font-semibold uppercase tracking-wider ${
                          (attendance.lateMinutes || 0) > VERY_LATE_THRESHOLD
                            ? "text-rose-400"
                            : "text-brand-light"
                        }`}
                      >
                        Keterlambatan
                      </p>
                    </div>
                    <p
                      className={`text-2xl font-black ${
                        (attendance.lateMinutes || 0) > VERY_LATE_THRESHOLD
                          ? "text-rose-700"
                          : "text-brand"
                      }`}
                    >
                      {attendance.lateMinutes}
                    </p>
                    <p
                      className={`text-xs mt-0.5 ${
                        (attendance.lateMinutes || 0) > VERY_LATE_THRESHOLD
                          ? "text-rose-400"
                          : "text-brand-light"
                      }`}
                    >
                      Menit
                    </p>
                  </div>
                ) : (
                  /* Placeholder when on-time to keep grid balanced */
                  <div className="bg-brand/10 rounded-xl border border-brand/20 p-4 text-center shadow-sm col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <CheckCircle size={14} className="text-brand-light" />
                      <p className="text-xs font-semibold text-brand-light uppercase tracking-wider">
                        Keterlambatan
                      </p>
                    </div>
                    <p className="text-2xl font-black text-brand">0</p>
                    <p className="text-xs text-brand-light mt-0.5">Menit</p>
                  </div>
                )}
              </div>

              {/* Note if present */}
              {attendance.note && (
                <div className="mt-4 bg-white/60 rounded-xl border border-slate-100 p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Keterangan
                  </p>
                  <p className="text-sm text-slate-700 font-medium">
                    {attendance.note}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* ── Monthly Summary Card ── */}
          {monthlySummary && (
            <Card className="shadow-md border-slate-200 overflow-hidden" padding={false}>
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-brand/20 flex items-center gap-2.5">
                <TrendingUp size={18} className="text-brand" />
                <h3 className="font-bold text-brand tracking-tight">Ringkasan Bulan Ini</h3>
                <span className="ml-auto text-xs font-semibold text-brand-light uppercase">
                  {new Date().toLocaleDateString("id-ID", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {/* Hadir */}
                  <div className="bg-brand/10 border border-brand/20 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                    <UserCheck size={20} className="mx-auto text-brand mb-1.5" />
                    <p className="text-2xl font-black text-brand">
                      {monthlySummary.present}
                    </p>
                    <p className="text-[11px] font-semibold text-brand uppercase mt-0.5">
                      Hadir
                    </p>
                  </div>

                  {/* Terlambat */}
                  <div className="bg-brand/10 border border-brand/20 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                    <AlertTriangle
                      size={20}
                      className="mx-auto text-brand mb-1.5"
                    />
                    <p className="text-2xl font-black text-brand">
                      {monthlySummary.late}
                    </p>
                    <p className="text-[11px] font-semibold text-brand uppercase mt-0.5">
                      Terlambat
                    </p>
                  </div>

                  {/* Tidak Hadir */}
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                    <XCircle size={20} className="mx-auto text-rose-500 mb-1.5" />
                    <p className="text-2xl font-black text-rose-700">
                      {monthlySummary.absent}
                    </p>
                    <p className="text-[11px] font-semibold text-rose-500 uppercase mt-0.5">
                      Absen
                    </p>
                  </div>

                  {/* Izin */}
                  <div className="bg-brand/10 border border-brand/20 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                    <Info size={20} className="mx-auto text-brand mb-1.5" />
                    <p className="text-2xl font-black text-brand">
                      {monthlySummary.permission}
                    </p>
                    <p className="text-[11px] font-semibold text-brand uppercase mt-0.5">
                      Izin
                    </p>
                  </div>

                  {/* Sakit */}
                  <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                    <AlertCircle
                      size={20}
                      className="mx-auto text-yellow-500 mb-1.5"
                    />
                    <p className="text-2xl font-black text-yellow-700">
                      {monthlySummary.sick}
                    </p>
                    <p className="text-[11px] font-semibold text-yellow-500 uppercase mt-0.5">
                      Sakit
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      ) : (
        /* ═══════════════════════════════════════════════ */
        /* ── BELUM CHECK-IN: Form ── */
        /* ═══════════════════════════════════════════════ */
        <>
          {/* Status indicator */}
          <Card className="border-slate-200 shadow-md" padding={false}>
            <div className="h-1.5 w-full bg-gradient-to-r from-slate-300 to-slate-400" />
            <div className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                <Clock size={28} className="text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Status Kehadiran
                </p>
                <StatusBadge tier="belum" />
              </div>
              <p className="text-sm text-slate-500 font-medium">
                {message || "Silakan lakukan check-in untuk mencatat kehadiran hari ini."}
              </p>

              {/* Show work start time info */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-lg text-sm">
                <Briefcase size={14} className="text-slate-400" />
                <span className="text-slate-500">Jam Kerja Mulai:</span>
                <span className="font-bold text-slate-800">{workStartTime || "07:00"} WIB</span>
              </div>
            </div>
          </Card>

          {/* Check-in form card */}
          <Card className="shadow-md border-slate-200">
            <div className="space-y-6">
              {!isWindowOpen && windowMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold tracking-tight">Perhatian</h3>
                    <p className="text-sm">{windowMessage}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Pilih Status Kehadiran
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    disabled={!isWindowOpen}
                    onClick={() => setForm({ ...form, status: "hadir" })}
                    className={`py-3.5 rounded-xl font-semibold transition-all border-2 ${
                      form.status === "hadir"
                        ? "border-brand bg-brand/10 text-brand shadow-md shadow-emerald-100"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    } ${!isWindowOpen && "opacity-50 cursor-not-allowed"}`}
                  >
                    <CheckCircle size={18} className="mx-auto mb-1" />
                    Hadir
                  </button>
                  <button
                    onClick={() => setForm({ ...form, status: "izin" })}
                    className={`py-3.5 rounded-xl font-semibold transition-all border-2 ${
                      form.status === "izin"
                        ? "border-brand bg-brand/10 text-brand shadow-md shadow-blue-100"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <Info size={18} className="mx-auto mb-1" />
                    Izin
                  </button>
                  <button
                    onClick={() => setForm({ ...form, status: "sakit" })}
                    className={`py-3.5 rounded-xl font-semibold transition-all border-2 ${
                      form.status === "sakit"
                        ? "border-yellow-500 bg-yellow-50 text-yellow-700 shadow-md shadow-yellow-100"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <AlertCircle size={18} className="mx-auto mb-1" />
                    Sakit
                  </button>
                </div>
              </div>

              {(form.status === "izin" || form.status === "sakit") && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Keterangan (Wajib)
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="w-full border border-slate-200 p-3 rounded-xl resize-none focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all bg-slate-50/50"
                    placeholder="Tuliskan keterangan detail..."
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  ></textarea>
                </div>
              )}

              <button
                onClick={handleCheckin}
                disabled={
                  isSubmitting ||
                  (!isWindowOpen && form.status === "hadir") ||
                  ((form.status === "izin" || form.status === "sakit") &&
                    !form.note.trim())
                }
                className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-light to-brand text-white font-bold text-lg shadow-lg shadow-indigo-200 hover:from-brand-light hover:to-brand transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Memproses...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <LogIn size={20} />
                    Konfirmasi Kehadiran
                  </span>
                )}
              </button>
            </div>
          </Card>

          {/* Monthly Summary (also shown before check-in) */}
          {monthlySummary && (
            <Card className="shadow-md border-slate-200 overflow-hidden" padding={false}>
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-brand/20 flex items-center gap-2.5">
                <TrendingUp size={18} className="text-brand" />
                <h3 className="font-bold text-brand tracking-tight">Ringkasan Bulan Ini</h3>
                <span className="ml-auto text-xs font-semibold text-brand-light uppercase">
                  {new Date().toLocaleDateString("id-ID", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  <div className="bg-brand/10 border border-brand/20 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                    <UserCheck size={20} className="mx-auto text-brand mb-1.5" />
                    <p className="text-2xl font-black text-brand">{monthlySummary.present}</p>
                    <p className="text-[11px] font-semibold text-brand uppercase mt-0.5">Hadir</p>
                  </div>
                  <div className="bg-brand/10 border border-brand/20 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                    <AlertTriangle size={20} className="mx-auto text-brand mb-1.5" />
                    <p className="text-2xl font-black text-brand">{monthlySummary.late}</p>
                    <p className="text-[11px] font-semibold text-brand uppercase mt-0.5">Terlambat</p>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                    <XCircle size={20} className="mx-auto text-rose-500 mb-1.5" />
                    <p className="text-2xl font-black text-rose-700">{monthlySummary.absent}</p>
                    <p className="text-[11px] font-semibold text-rose-500 uppercase mt-0.5">Absen</p>
                  </div>
                  <div className="bg-brand/10 border border-brand/20 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                    <Info size={20} className="mx-auto text-brand mb-1.5" />
                    <p className="text-2xl font-black text-brand">{monthlySummary.permission}</p>
                    <p className="text-[11px] font-semibold text-brand uppercase mt-0.5">Izin</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                    <AlertCircle size={20} className="mx-auto text-yellow-500 mb-1.5" />
                    <p className="text-2xl font-black text-yellow-700">{monthlySummary.sick}</p>
                    <p className="text-[11px] font-semibold text-yellow-500 uppercase mt-0.5">Sakit</p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
