"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  ClipboardCheck,
  Save,
  RefreshCw,
  Download,
  Calendar,
  FileSpreadsheet,
  Search,
  ChevronRight,
  Info
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { apiService } from "@/services/apiService";
import { cn } from "@/lib/utils";
import { enqueueMutation } from "@/lib/offlineQueue";

// Types
interface ClassData {
  id: number;
  name: string;
}

interface AttendanceRecord {
  studentId: number;
  nis: string;
  name: string;
  status: "hadir" | "izin" | "sakit" | "alpa";
  note?: string;
}

interface StudentAttendance {
  date: string;
  status: "hadir" | "izin" | "sakit" | "alpa";
  note?: string;
}

export default function AttendanceInputPage() {
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  
  // Teacher States
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Student States
  const [studentHistory, setStudentHistory] = useState<StudentAttendance[]>([]);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0]
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setRole(parsed.role);
        
        if (parsed.role === "teacher") {
          fetchTeacherClasses();
        } else if (parsed.role === "student") {
          fetchStudentHistory(parsed.id);
        }
      } catch (e) {
        console.error("Failed to parse user data", e);
        setRole("unauthorized");
      }
    } else {
      setRole("unauthorized");
    }
    setLoading(false);
  }, []);

  // Guru hanya melihat kelas yang dia ajar / wali kelas
  const fetchTeacherClasses = async () => {
    try {
      // Gunakan endpoint yang sudah difilter: hanya kelas yang diajar guru ini
      // (dari jadwal mengajar + wali kelas)
      const response = await apiService.getAll("/hub/teacher-classes");
      if (response.success) {
        setClasses(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch teacher classes", err);
    }
  };

  const fetchStudentHistory = async (studentId: number) => {
    setLoading(true);
    try {
      const response = await apiService.getAll("/attendances", { 
        studentId,
        from: dateRange.from,
        to: dateRange.to
      });
      if (response.success) {
        setStudentHistory(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch student history", err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsForInput = async () => {
    if (!selectedClass || !selectedDate) return;
    
    setIsLoadingStudents(true);
    setErrorBanner(null);
    setSuccessBanner(null);
    
    try {
      const response = await apiService.getAll("/attendances/by-class", {
        classId: selectedClass,
        date: selectedDate
      });
      
      if (response.success) {
        // Defaulting all to 'hadir' if no previous record exists or as specified
        const records = response.data.map((s: any) => ({
          ...s,
          status: s.status || "hadir",
          note: s.note || ""
        }));
        setStudentRecords(records);
      }
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || "Gagal memuat daftar siswa");
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleStatusChange = (studentId: number, status: "hadir" | "izin" | "sakit" | "alpa") => {
    setStudentRecords(prev => 
      prev.map(r => r.studentId === studentId ? { ...r, status } : r)
    );
  };

  const handleNoteChange = (studentId: number, note: string) => {
    setStudentRecords(prev => 
      prev.map(r => r.studentId === studentId ? { ...r, note } : r)
    );
  };

  const markAllHadir = () => {
    setStudentRecords(prev => prev.map(r => ({ ...r, status: "hadir" })));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorBanner(null);
    setSuccessBanner(null);
    
    const payload = {
      classId: Number(selectedClass),
      date: selectedDate,
      records: studentRecords.map(r => ({
        studentId: r.studentId,
        status: r.status,
        note: r.note
      }))
    };

    // Optimistic: immediately show success
    setSuccessBanner("Data absensi berhasil disimpan!");
    
    try {
      const response = await apiService.create("/attendances/bulk", payload);
      if (response.success) {
        setStudentRecords([]);
        setSelectedClass("");
      }
    } catch (err: any) {
      const isNetworkError = !err.response;
      if (isNetworkError) {
        // Queue for offline sync
        await enqueueMutation("/attendances/bulk", "POST", payload);
        setSuccessBanner("Absensi disimpan secara lokal — akan disinkronkan saat online");
        setStudentRecords([]);
        setSelectedClass("");
      } else if (err.response?.status === 400) {
        setSuccessBanner(null);
        setErrorBanner("Data absensi untuk kelas dan tanggal ini sudah ada.");
      } else {
        setSuccessBanner(null);
        setErrorBanner(err.response?.data?.message || "Gagal menyimpan absensi");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem("jwt_token");
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      
      const res = await fetch(`${baseUrl}/attendances/export/excel`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error("Gagal export data");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Rekap_Kehadiran_Siswa_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="animate-spin mb-4 text-brand" size={40} />
        <p className="animate-pulse font-medium">Memuat halaman...</p>
      </div>
    );
  }

  if (role !== "teacher" && role !== "student") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="p-6 rounded-full bg-rose-50 text-rose-500 mb-6">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Akses Dibatasi</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Anda tidak memiliki akses ke halaman ini. Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.
        </p>
      </div>
    );
  }

  const stats = {
    hadir: studentRecords.filter(r => r.status === "hadir").length,
    izin: studentRecords.filter(r => r.status === "izin").length,
    sakit: studentRecords.filter(r => r.status === "sakit").length,
    alpa: studentRecords.filter(r => r.status === "alpa").length,
  };

  const studentStats = {
    hadir: studentHistory.filter(r => r.status === "hadir").length,
    izin: studentHistory.filter(r => r.status === "izin").length,
    sakit: studentHistory.filter(r => r.status === "sakit").length,
    alpa: studentHistory.filter(r => r.status === "alpa").length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {role === "teacher" ? "Input Absensi" : "Kehadiran Saya"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {role === "teacher" 
              ? "Catat kehadiran siswa per kelas yang Anda ajar" 
              : "Rekap kehadiran Anda selama ini"}
          </p>
        </div>
        {role === "teacher" && (
          <Button 
            variant="secondary" 
            onClick={handleExport}
            disabled={isExporting}
            className="shadow-sm hover:shadow-md transition-all border border-border"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export Excel
          </Button>
        )}
      </div>

      {role === "teacher" ? (
        <>
          {/* Phase 1: Selector */}
          <Card className="p-6 shadow-sm border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <SearchableSelect
                label="Pilih Kelas"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                options={[
                  { value: "", label: classes.length === 0 ? "Tidak ada kelas yang Anda ajar..." : "Pilih Kelas..." },
                  ...classes.map(c => ({ value: String(c.id), label: c.name }))
                ]}
                placeholder={classes.length === 0 ? "Tidak ada kelas yang Anda ajar..." : "Pilih Kelas..."}
              />
              <Input
                label="Pilih Tanggal"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <Button 
                onClick={loadStudentsForInput}
                disabled={!selectedClass || !selectedDate || isLoadingStudents || classes.length === 0}
                className="w-full"
              >
                {isLoadingStudents ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                Muat Daftar Siswa
              </Button>
            </div>
            {classes.length === 0 && (
              <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                <Info size={14} />
                Anda tidak terdaftar sebagai pengajar atau wali kelas di kelas manapun. Hubungi admin jika ini adalah kesalahan.
              </p>
            )}
          </Card>

          {/* Error / Success Banners */}
          {errorBanner && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <XCircle size={20} />
              <p className="text-sm font-medium">{errorBanner}</p>
            </div>
          )}
          {successBanner && (
            <div className="p-4 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={20} />
              <p className="text-sm font-medium">{successBanner}</p>
            </div>
          )}

          {/* Phase 2: Table & Stats */}
          {studentRecords.length > 0 ? (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 border-l-4 border-l-emerald-600 shadow-sm bg-brand/10/30">
                  <p className="text-[10px] font-bold text-brand uppercase tracking-wider mb-1">Hadir</p>
                  <h3 className="text-2xl font-bold text-brand tracking-tight">{stats.hadir}</h3>
                </Card>
                <Card className="p-4 border-l-4 border-l-blue-600 shadow-sm bg-brand/10/30">
                  <p className="text-[10px] font-bold text-brand uppercase tracking-wider mb-1">Izin</p>
                  <h3 className="text-2xl font-bold text-brand tracking-tight">{stats.izin}</h3>
                </Card>
                <Card className="p-4 border-l-4 border-l-amber-600 shadow-sm bg-brand/10/30">
                  <p className="text-[10px] font-bold text-brand uppercase tracking-wider mb-1">Sakit</p>
                  <h3 className="text-2xl font-bold text-brand tracking-tight">{stats.sakit}</h3>
                </Card>
                <Card className="p-4 border-l-4 border-l-rose-600 shadow-sm bg-rose-50/30">
                  <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1">Alpa</p>
                  <h3 className="text-2xl font-bold text-rose-900 tracking-tight">{stats.alpa}</h3>
                </Card>
              </div>

              {/* Table Toolbar */}
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2 tracking-tight">
                  <Users size={20} className="text-brand" />
                  Daftar Siswa
                </h2>
                <Button variant="secondary" size="sm" onClick={markAllHadir} className="text-xs font-semibold">
                  <CheckCircle2 size={14} />
                  Tandai Semua Hadir
                </Button>
              </div>

              {/* Attendance Table */}
              <Card className="overflow-hidden border-border shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-16 text-center">No</th>
                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-32">NIS</th>
                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Nama Siswa</th>
                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Status Kehadiran</th>
                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {studentRecords.map((record, idx) => (
                        <tr key={record.studentId} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-muted-foreground text-center">{idx + 1}</td>
                          <td className="px-6 py-4 text-sm font-bold text-foreground font-mono">{record.nis}</td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-foreground">{record.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-1">
                              <StatusButton 
                                active={record.status === "hadir"} 
                                type="hadir" 
                                onClick={() => handleStatusChange(record.studentId, "hadir")} 
                              />
                              <StatusButton 
                                active={record.status === "izin"} 
                                type="izin" 
                                onClick={() => handleStatusChange(record.studentId, "izin")} 
                              />
                              <StatusButton 
                                active={record.status === "sakit"} 
                                type="sakit" 
                                onClick={() => handleStatusChange(record.studentId, "sakit")} 
                              />
                              <StatusButton 
                                active={record.status === "alpa"} 
                                type="alpa" 
                                onClick={() => handleStatusChange(record.studentId, "alpa")} 
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              placeholder="Catatan..."
                              className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                              value={record.note}
                              onChange={(e) => handleNoteChange(record.studentId, e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Submit Section */}
              <div className="flex justify-end pt-4">
                <Button 
                  size="lg" 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="px-10 shadow-lg shadow-brand/20"
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  Simpan Absensi
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center border-2 border-dashed border-border rounded-3xl bg-gradient-to-br from-card to-muted/20">
              <div className="inline-flex p-5 rounded-2xl bg-brand/10 text-brand mb-6 shadow-sm">
                <ClipboardCheck size={40} />
              </div>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">Mulai Input Absensi</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-3 leading-relaxed">
                Pilih kelas dan tanggal untuk memulai input absensi siswa. Pastikan data yang diinput sudah sesuai dengan kehadiran di kelas.
              </p>
            </div>
          )}
        </>
      ) : (
        /* Student View Logic */
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5 border-l-4 border-l-emerald-600 shadow-sm bg-brand/10/30">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-brand uppercase tracking-wider mb-1">Total Hadir</p>
                  <h3 className="text-3xl font-bold text-brand tracking-tight">{studentStats.hadir}</h3>
                </div>
                <div className="p-2 bg-brand/10 rounded-lg text-brand">
                  <CheckCircle2 size={18} />
                </div>
              </div>
            </Card>
            <Card className="p-5 border-l-4 border-l-blue-600 shadow-sm bg-brand/10/30">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-brand uppercase tracking-wider mb-1">Total Izin</p>
                  <h3 className="text-3xl font-bold text-brand tracking-tight">{studentStats.izin}</h3>
                </div>
                <div className="p-2 bg-brand/10 rounded-lg text-brand">
                  <Info size={18} />
                </div>
              </div>
            </Card>
            <Card className="p-5 border-l-4 border-l-amber-600 shadow-sm bg-brand/10/30">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-brand uppercase tracking-wider mb-1">Total Sakit</p>
                  <h3 className="text-3xl font-bold text-brand tracking-tight">{studentStats.sakit}</h3>
                </div>
                <div className="p-2 bg-brand/10 rounded-lg text-brand">
                  <Clock size={18} />
                </div>
              </div>
            </Card>
            <Card className="p-5 border-l-4 border-l-rose-600 shadow-sm bg-rose-50/30">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-1">Total Alpa</p>
                  <h3 className="text-3xl font-bold text-rose-900 tracking-tight">{studentStats.alpa}</h3>
                </div>
                <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                  <XCircle size={18} />
                </div>
              </div>
            </Card>
          </div>

          {/* Filters for Students */}
          <Card className="p-4 border-border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <Input
                label="Dari Tanggal"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
              <Input
                label="Sampai Tanggal"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
              <Button 
                variant="secondary" 
                onClick={() => fetchStudentHistory(user.id)}
                className="w-full"
              >
                <RefreshCw size={18} className={cn(loading && "animate-spin")} />
                Filter Data
              </Button>
            </div>
          </Card>

          {/* History List */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={20} className="text-brand" />
              <h2 className="text-xl font-bold text-foreground tracking-tight">Riwayat Kehadiran</h2>
            </div>
            
            {studentHistory.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {studentHistory.map((item, idx) => (
                  <Card key={idx} className="p-4 border-border hover:border-brand/20 transition-all hover:shadow-md group">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-muted group-hover:bg-brand/10 transition-colors">
                          <Calendar size={18} className="text-muted-foreground group-hover:text-brand" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {new Date(item.date).toLocaleDateString('id-ID', { 
                              weekday: 'long', 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </p>
                          {item.note && <p className="text-xs text-muted-foreground mt-0.5 italic">"{item.note}"</p>}
                        </div>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center border-2 border-dashed border-border rounded-3xl bg-gradient-to-br from-card to-muted/20">
                <div className="inline-flex p-5 rounded-2xl bg-brand/10 text-brand mb-6 shadow-sm">
                  <ClipboardCheck size={40} />
                </div>
                <h3 className="text-2xl font-bold text-foreground tracking-tight">Belum Ada Riwayat</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-3 leading-relaxed">
                  Belum ada data kehadiran untuk periode ini. Tetap semangat belajar dan jaga kesehatan!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusButton({ active, type, onClick }: { 
  active: boolean, 
  type: "hadir" | "izin" | "sakit" | "alpa", 
  onClick: () => void 
}) {
  const styles = {
    hadir: active ? "bg-brand/10 text-brand border-brand/20 shadow-sm" : "bg-transparent text-muted-foreground border-transparent hover:bg-brand/10",
    izin: active ? "bg-brand/10 text-brand border-brand/20 shadow-sm" : "bg-transparent text-muted-foreground border-transparent hover:bg-brand/10",
    sakit: active ? "bg-brand/10 text-brand border-brand/20 shadow-sm" : "bg-transparent text-muted-foreground border-transparent hover:bg-brand/10",
    alpa: active ? "bg-rose-100 text-rose-700 border-rose-300 shadow-sm" : "bg-transparent text-muted-foreground border-transparent hover:bg-rose-50",
  };

  const labels = { hadir: "H", izin: "I", sakit: "S", alpa: "A" };
  const fullLabels = { hadir: "Hadir", izin: "Izin", sakit: "Sakit", alpa: "Alpa" };

  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200 min-w-[36px]",
        styles[type]
      )}
      title={fullLabels[type]}
    >
      {labels[type]}
    </button>
  );
}

function StatusBadge({ status }: { status: "hadir" | "izin" | "sakit" | "alpa" }) {
  const styles = {
    hadir: "bg-brand/10 text-brand border-brand/20",
    izin: "bg-brand/10 text-brand border-brand/20",
    sakit: "bg-brand/10 text-brand border-brand/20",
    alpa: "bg-rose-100 text-rose-700 border-rose-200",
  };

  const labels = {
    hadir: "Hadir",
    izin: "Izin",
    sakit: "Sakit",
    alpa: "Alpa",
  };

  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-[10px] font-bold border shadow-sm uppercase tracking-wide",
      styles[status]
    )}>
      {labels[status]}
    </span>
  );
}