"use client";
import React, { useState, useEffect } from "react";
import { apiService } from "@/services/apiService";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ClipboardCheck } from "lucide-react";

export default function TeacherAttendancesPage() {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<"bulanan" | "harian" | "range" | "mingguan">("bulanan");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterWeekStart, setFilterWeekStart] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [overrideForm, setOverrideForm] = useState({
    status: "",
    note: "",
    overrideReason: "",
  });
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role);
    // Debounce to avoid too many requests on typing date
    const timer = setTimeout(() => {
      fetchAttendances();
    }, 300);
    return () => clearTimeout(timer);
  }, [filterMode, selectedMonth, selectedYear, filterDate, filterStartDate, filterEndDate, filterWeekStart]);

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (filterMode === "bulanan") {
        params.month = selectedMonth;
        params.year = selectedYear;
      } else if (filterMode === "harian") {
        if (filterDate) params.date = filterDate;
      } else if (filterMode === "range") {
        if (filterStartDate) params.startDate = filterStartDate;
        if (filterEndDate) params.endDate = filterEndDate;
      } else if (filterMode === "mingguan") {
        if (filterWeekStart) params.weekStart = filterWeekStart;
      }

      const res = await apiService.getAll("/teacher-attendances", params);
      setAttendances(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("jwt_token");
      const params = new URLSearchParams();
      if (filterMode === "bulanan") {
        params.append("month", String(selectedMonth));
        params.append("year", String(selectedYear));
      } else if (filterMode === "harian") {
        if (filterDate) params.append("date", filterDate);
      } else if (filterMode === "range") {
        if (filterStartDate) params.append("startDate", filterStartDate);
        if (filterEndDate) params.append("endDate", filterEndDate);
      } else if (filterMode === "mingguan") {
        if (filterWeekStart) params.append("weekStart", filterWeekStart);
      }

      const res = await fetch(`/api/teacher-attendances/export?${params.toString()}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error("Gagal export data");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // Nama file dinamis sesuai mode filter aktif
      let downloadName = "Rekap_Kehadiran_Guru";
      if (filterMode === "bulanan") downloadName += `_${selectedYear}_${String(selectedMonth).padStart(2, "0")}`;
      else if (filterMode === "harian" && filterDate) downloadName += `_${filterDate}`;
      else if (filterMode === "mingguan" && filterWeekStart) downloadName += `_Minggu_${filterWeekStart}`;
      else if (filterMode === "range" && filterStartDate && filterEndDate) downloadName += `_${filterStartDate}_sd_${filterEndDate}`;
      link.download = `${downloadName}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Gagal export data kehadiran guru.");
    }
  };

  const openOverrideModal = (a: any) => {
    setSelectedAttendance(a);
    setOverrideForm({
      status: a.status,
      note: a.note || "",
      overrideReason: "",
    });
    setIsOverrideModalOpen(true);
  };

  const handleOverride = async () => {
    if (!overrideForm.overrideReason.trim()) {
      alert("Alasan override wajib diisi.");
      return;
    }
    try {
      await apiService.update(
        "/teacher-attendances",
        `${selectedAttendance.id}/override`,
        overrideForm
      );
      setIsOverrideModalOpen(false);
      fetchAttendances();
    } catch (error: any) {
      alert(error.response?.data?.message || "Gagal override.");
    }
  };

  const months = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kehadiran Guru</h1>
          <p className="text-muted-foreground">Monitoring kehadiran dan keterlambatan guru</p>
        </div>
        <Button onClick={handleExport} className="bg-brand hover:bg-brand text-white">
          Export Excel
        </Button>
      </div>

      <Card padding={false}>
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle>Data Kehadiran</CardTitle>
          <div className="flex gap-2">
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
              className="flex h-9 rounded-lg border border-input bg-card px-3 text-sm"
            >
              <option value="bulanan">Bulanan</option>
              <option value="harian">Harian</option>
              <option value="mingguan">Mingguan</option>
              <option value="range">Rentang Tanggal</option>
            </select>

            {filterMode === "bulanan" && (
              <>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="flex h-9 rounded-lg border border-input bg-card px-3 text-sm"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="flex h-9 rounded-lg border border-input bg-card px-3 text-sm"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </>
            )}

            {filterMode === "harian" && (
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="flex h-9 rounded-lg border border-input bg-card px-3 text-sm"
              />
            )}

            {filterMode === "mingguan" && (
              <input
                type="date"
                value={filterWeekStart}
                onChange={(e) => setFilterWeekStart(e.target.value)}
                className="flex h-9 rounded-lg border border-input bg-card px-3 text-sm"
              />
            )}

            {filterMode === "range" && (
              <>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="flex h-9 rounded-lg border border-input bg-card px-3 text-sm"
                />
                <span className="self-center text-sm">s/d</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="flex h-9 rounded-lg border border-input bg-card px-3 text-sm"
                />
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3">No</th>
                    <th className="p-3">Nama Guru</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Jam Masuk</th>
                    <th className="p-3">Keterangan</th>
                    <th className="p-3">Tipe Input</th>
                    {userRole === "admin" && <th className="p-3">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {attendances.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <ClipboardCheck size={32} className="opacity-30" />
                          <p className="font-medium">Belum ada data kehadiran</p>
                          <p className="text-sm">
                            {filterMode === "bulanan" && `Guru belum melakukan check-in di bulan ${months.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`}
                            {filterMode === "harian" && filterDate && `Tidak ada data kehadiran pada ${new Date(filterDate + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`}
                            {filterMode === "mingguan" && filterWeekStart && `Tidak ada data kehadiran pada minggu yang dipilih`}
                            {filterMode === "range" && `Tidak ada data kehadiran pada rentang tanggal yang dipilih`}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    attendances.map((a, i) => (
                      <tr key={a.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">{i + 1}</td>
                        <td className="p-3 font-medium">{a.teacher.name}</td>
                        <td className="p-3">{new Date(a.date).toLocaleDateString('id-ID')}</td>
                        <td className="p-3">
                          <Badge
                            className={
                              a.status === 'hadir' ? 'bg-brand/100 hover:bg-brand' :
                              a.status === 'terlambat' ? 'bg-brand/100 hover:bg-brand' :
                              a.status === 'izin' ? 'bg-brand/100 hover:bg-brand' :
                              a.status === 'sakit' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' :
                              'bg-rose-500 hover:bg-rose-600'
                            }
                          >
                            {a.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {a.checkinAt ? new Date(a.checkinAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          {a.isLate && <span className="ml-2 text-brand text-xs">(Terlambat {a.lateMinutes}m)</span>}
                        </td>
                        <td className="p-3">{a.note || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.checkinType === 'self' ? 'bg-slate-100 text-slate-700' : 'bg-brand/10 text-brand'}`}>
                            {a.checkinType === 'self' ? 'Mandiri' : 'Override'}
                          </span>
                        </td>
                        {userRole === "admin" && (
                          <td className="p-3">
                            <button
                              onClick={() => openOverrideModal(a)}
                              className="text-brand hover:underline text-sm font-medium"
                            >
                              Edit/Override
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        title={`Override Kehadiran — ${selectedAttendance?.teacher?.name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Status Baru</label>
            <select
              className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
              value={overrideForm.status}
              onChange={(e) => setOverrideForm({ ...overrideForm, status: e.target.value })}
            >
              <option value="hadir">Hadir</option>
              <option value="terlambat">Terlambat</option>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="alpa">Alpa</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Keterangan Tambahan</label>
            <input
              type="text"
              className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
              value={overrideForm.note}
              onChange={(e) => setOverrideForm({ ...overrideForm, note: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Alasan Override <span className="text-rose-500">*</span>
            </label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm resize-none"
              placeholder="Contoh: Surat keterangan sakit terlampir"
              value={overrideForm.overrideReason}
              onChange={(e) => setOverrideForm({ ...overrideForm, overrideReason: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Alasan ini dicatat untuk audit trail.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setIsOverrideModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleOverride}
              disabled={!overrideForm.overrideReason.trim()}
            >
              Simpan Override
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
