"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Download, Loader2, RefreshCcw, ClipboardCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { apiService } from "@/services/apiService";

const statusConfig: Record<
  string,
  { variant: "success" | "warning" | "info" | "danger"; label: string }
> = {
  hadir: { variant: "success", label: "Hadir" },
  izin: { variant: "warning", label: "Izin" },
  sakit: { variant: "info", label: "Sakit" },
  alpa: { variant: "danger", label: "Alpa" },
};

export default function AttendancesPage() {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  // Filter state
  const [search, setSearch] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  // Default tanggal = hari ini
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Fetch list kelas untuk dropdown filter
  const fetchClasses = async () => {
    try {
      const res = await apiService.getAll("/classes");
      setClasses(res.data || []);
    } catch (err) {
      console.error("Gagal fetch kelas:", err);
    }
  };

  // Fetch kehadiran dengan filter aktif
  const fetchAttendances = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {};
      if (filterClassId) params.classId = filterClassId;
      if (filterStatus) params.status = filterStatus;
      if (filterDate) params.date = filterDate;
      if (search) params.search = search;

      const res = await apiService.getAll("/attendances", params);
      setAttendances(res.data || []);
    } catch (err) {
      console.error("Gagal fetch attendances:", err);
      setError("Gagal memuat data kehadiran. Silakan coba lagi.");
      setAttendances([]);
    } finally {
      setLoading(false);
    }
  }, [filterClassId, filterStatus, filterDate, search]);

  // Fetch kelas sekali saat mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch attendances dengan debounce 300ms setiap kali filter berubah
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAttendances();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchAttendances]);

  // Export Excel dengan filter yang aktif
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const token = localStorage.getItem("jwt_token");
      if (!token) throw new Error("Anda belum login");

      const params = new URLSearchParams();
      if (filterClassId) params.append("classId", filterClassId);
      if (filterStatus) params.append("status", filterStatus);
      if (filterDate) params.append("date", filterDate);

      const response = await fetch(
        `/api/attendances/export/excel?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Gagal export");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filterDate
        ? `Kehadiran_${filterDate}.xlsx`
        : "Rekap_Kehadiran.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Gagal export. Pastikan server aktif.");
    } finally {
      setIsExporting(false);
    }
  };

  // Reset filter (kecuali tanggal)
  const handleResetFilter = () => {
    setFilterClassId("");
    setFilterStatus("");
    setSearch("");
  };

  // Summary dari data real yang sudah difilter backend
  const summary = {
    hadir: attendances.filter((a) => a.status === "hadir").length,
    izin: attendances.filter((a) => a.status === "izin").length,
    sakit: attendances.filter((a) => a.status === "sakit").length,
    alpa: attendances.filter((a) => a.status === "alpa").length,
    total: attendances.length,
  };

  const summaryItems = [
    { key: "hadir", label: "Hadir", color: "emerald", count: summary.hadir },
    { key: "izin", label: "Izin", color: "amber", count: summary.izin },
    { key: "sakit", label: "Sakit", color: "blue", count: summary.sakit },
    { key: "alpa", label: "Alpa", color: "red", count: summary.alpa },
  ] as const;

  const hasActiveFilter = !!(filterClassId || filterStatus || search);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Rekap Kehadiran Siswa
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pantau kehadiran siswa per hari secara real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchAttendances}
            disabled={loading}
            title="Refresh data"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {isExporting ? "Menyiapkan..." : "Export Excel"}
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center justify-between gap-3">
          <span className="text-sm">{error}</span>
          <Button size="sm" variant="secondary" onClick={fetchAttendances}>
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryItems.map((item) => (
          <div
            key={item.key}
            className={`flex items-center gap-3 p-4 rounded-xl border border-${item.color}-200 bg-${item.color}-50`}
          >
            <div
              className={`h-10 w-10 rounded-lg bg-${item.color}-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
            >
              {item.count}
            </div>
            <div>
              <p className={`text-sm font-semibold text-${item.color}-700`}>
                {item.label}
              </p>
              <p className={`text-xs text-${item.color}-600`}>
                {summary.total > 0
                  ? ((item.count / summary.total) * 100).toFixed(0)
                  : 0}
                %
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Tabel */}
      <Card>
        {/* Filter row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Cari nama siswa..."
              icon={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              placeholder="Semua Kelas"
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              options={classes.map((c) => ({
                value: String(c.id),
                label: c.name,
              }))}
            />
          </div>
          <div className="w-36">
            <Select
              placeholder="Semua Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: "hadir", label: "Hadir" },
                { value: "izin", label: "Izin" },
                { value: "sakit", label: "Sakit" },
                { value: "alpa", label: "Alpa" },
              ]}
            />
          </div>
          <div className="w-44">
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          {hasActiveFilter && (
            <Button variant="secondary" size="sm" onClick={handleResetFilter}>
              Reset
            </Button>
          )}
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Memuat data kehadiran...</p>
            </div>
          ) : attendances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <ClipboardCheck size={40} className="opacity-30 mb-3" />
              <p className="font-medium">Belum ada data kehadiran</p>
              <p className="text-sm mt-1">
                {filterDate
                  ? `Tidak ada data untuk tanggal ${new Date(
                      filterDate + "T00:00:00"
                    ).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}`
                  : "Coba ubah filter untuk melihat data"}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                    No
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                    Siswa
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                    Kelas
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                    Tanggal
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                    Keterangan
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendances.map((att, i) => {
                  const config = statusConfig[att.status] ?? {
                    variant: "danger" as const,
                    label: att.status,
                  };
                  return (
                    <tr
                      key={att.id}
                      className="border-b border-border/50 hover:bg-accent/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={att.studentName} size="sm" />
                          <div>
                            <p className="font-medium text-foreground">
                              {att.studentName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {att.studentNis}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="info">{att.className}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(att.date + "T00:00:00").toLocaleDateString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {att.note || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info total */}
        {!loading && attendances.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Menampilkan{" "}
              <span className="font-medium text-foreground">
                {attendances.length}
              </span>{" "}
              data
            </p>
            <p className="text-sm font-medium text-foreground">
              Kehadiran:{" "}
              <span className="text-brand font-bold">
                {summary.total > 0
                  ? ((summary.hadir / summary.total) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
