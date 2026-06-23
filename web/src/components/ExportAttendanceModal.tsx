"use client";

import { useState, useEffect } from "react";
import { X, Download, Loader2, FileSpreadsheet } from "lucide-react";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { apiService } from "@/services/apiService";

interface ExportAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportAttendanceModal({ isOpen, onClose }: ExportAttendanceModalProps) {
  const [exportType, setExportType] = useState<"student" | "teacher">("student");
  const [loading, setLoading] = useState(false);

  // Student filters
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Teacher filters
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const monthNames = [
    { value: "1", label: "Januari" },
    { value: "2", label: "Februari" },
    { value: "3", label: "Maret" },
    { value: "4", label: "April" },
    { value: "5", label: "Mei" },
    { value: "6", label: "Juni" },
    { value: "7", label: "Juli" },
    { value: "8", label: "Agustus" },
    { value: "9", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  // Fetch classes on mount
  useEffect(() => {
    if (isOpen && exportType === "student") {
      fetchClasses();
    }
  }, [isOpen, exportType]);

  const fetchClasses = async () => {
    try {
      const response = await apiService.getAll("/classes");
      if (response.data?.success) {
        setClasses(response.data.data || []);
        if (response.data.data.length > 0) {
          setSelectedClass(response.data.data[0].id.toString());
        }
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
      toast.error("Gagal memuat data kelas");
    }
  };

  const handleDownload = async () => {
    // Validation
    if (exportType === "student") {
      if (!selectedClass) {
        toast.error("Pilih kelas terlebih dahulu");
        return;
      }
      if (!startDate || !endDate) {
        toast.error("Pilih periode tanggal terlebih dahulu");
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        toast.error("Tanggal mulai tidak boleh lebih besar dari tanggal akhir");
        return;
      }
    } else {
      if (!selectedMonth) {
        toast.error("Pilih bulan terlebih dahulu");
        return;
      }
      if (!selectedYear) {
        toast.error("Masukkan tahun terlebih dahulu");
        return;
      }
    }

    setLoading(true);
    try {
      let endpoint = "";
      let filename = "";

      if (exportType === "student") {
        endpoint = `/export/attendance/student?classId=${selectedClass}&startDate=${startDate}&endDate=${endDate}`;
        const className = classes.find((c) => c.id.toString() === selectedClass)?.name || "Unknown";
        filename = `Rekap_Siswa_${className}_${Date.now()}.xlsx`;
      } else {
        endpoint = `/export/attendance/teacher?month=${selectedMonth}&year=${selectedYear}`;
        const monthName = monthNames.find((m) => m.value === selectedMonth)?.label || "Unknown";
        filename = `Rekap_Tutor_${monthName}_${selectedYear}.xlsx`;
      }

      console.log("Downloading from:", endpoint);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal download Excel");
      }

      const blob = await response.blob();
      saveAs(blob, filename);
      toast.success("Excel berhasil didownload!");
      onClose();
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error(error.message || "Gagal download Excel");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4BB8FA] to-[#1591DC]">
              <FileSpreadsheet className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Export Excel</h2>
              <p className="text-sm text-gray-500">Rekap Kehadiran</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            disabled={loading}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Toggle Type */}
        <div className="mb-6 flex gap-2 rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => setExportType("student")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              exportType === "student"
                ? "bg-gradient-to-r from-[#4BB8FA] to-[#1591DC] text-white shadow-md"
                : "text-gray-600 hover:text-gray-900"
            }`}
            disabled={loading}
          >
            Rekap Siswa
          </button>
          <button
            onClick={() => setExportType("teacher")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              exportType === "teacher"
                ? "bg-gradient-to-r from-[#4BB8FA] to-[#1591DC] text-white shadow-md"
                : "text-gray-600 hover:text-gray-900"
            }`}
            disabled={loading}
          >
            Rekap Tutor
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {exportType === "student" ? (
            <>
              {/* Class Selector */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Kelas</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#1591DC] focus:outline-none focus:ring-2 focus:ring-[#4BB8FA]/20"
                  disabled={loading}
                >
                  <option value="">Pilih Kelas</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#1591DC] focus:outline-none focus:ring-2 focus:ring-[#4BB8FA]/20"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Tanggal Akhir</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#1591DC] focus:outline-none focus:ring-2 focus:ring-[#4BB8FA]/20"
                    disabled={loading}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Month Selector */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Bulan</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#1591DC] focus:outline-none focus:ring-2 focus:ring-[#4BB8FA]/20"
                  disabled={loading}
                >
                  <option value="">Pilih Bulan</option>
                  {monthNames.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Input */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Tahun</label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  min="2020"
                  max="2030"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#1591DC] focus:outline-none focus:ring-2 focus:ring-[#4BB8FA]/20"
                  disabled={loading}
                />
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            disabled={loading}
          >
            Batal
          </button>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4BB8FA] to-[#1591DC] px-4 py-2.5 font-bold text-white shadow-lg shadow-[#4BB8FA]/30 transition-all hover:shadow-xl hover:shadow-[#4BB8FA]/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Download Excel
              </>
            )}
          </button>
        </div>

        {/* Info Text */}
        <p className="mt-4 text-center text-xs text-gray-500">
          File akan didownload dalam format .xlsx
        </p>
      </div>
    </div>
  );
}
