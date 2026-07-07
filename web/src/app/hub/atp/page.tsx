"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  Plus,
  BookOpen,
  Calendar,
  Layers,
  FileSpreadsheet,
  Download,
  Upload,
  FileJson,
  Trash2,
  Archive,
  CheckCircle,
  AlertCircle,
  Eye,
  Loader2,
  RefreshCw,
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Settings,
  ShieldAlert,
  UserCheck
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { apiService } from "@/services/apiService";
import api from "@/lib/axios";
import toast from "react-hot-toast";

export default function AtpPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [atpList, setAtpList] = useState<any[]>([]);
  const [mySubjects, setMySubjects] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSubjectManagerOpen, setIsSubjectManagerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedAtpIdForImport, setSelectedAtpIdForImport] = useState<number | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Subject Manager form
  const [selectedSubjectToBind, setSelectedSubjectToBind] = useState("");

  // Wizard Multi-step State (6 Steps)
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardForm, setWizardForm] = useState({
    academicYearId: "",
    subjectId: "",
    classId: "",
    totalMeetings: 16,
    learningObjective: "",
    learningStrategy: "",
    teacherNote: ""
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.role !== "teacher") {
          window.location.href = "/hub/dashboard";
          return;
        }
        setUser(parsed);
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }
  }, []);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const isTeacher = user.role === "teacher";
      const isStudent = user.role === "student";

      if (isTeacher) {
        // Load data guru
        const [atpRes, subjectsRes, allSubsRes, classesRes, yearsRes] = await Promise.all([
          apiService.getAll("/atp"),
          apiService.getAll("/atp/my-subjects"),
          apiService.getAll("/lms/subjects"), // load all subjects to register
          apiService.getAll("/lms/classes"),
          apiService.getAll("/academic-years")
        ]);

        setAtpList(atpRes.data || []);
        setMySubjects(subjectsRes.data || []);
        setAllSubjects(allSubsRes.data || []);
        setClasses(classesRes.data || []);
        setAcademicYears(yearsRes.data || []);

        // Pre-select active academic year
        const activeYear = (yearsRes.data || []).find((y: any) => y.isActive);
        if (activeYear) {
          setWizardForm(prev => ({ ...prev, academicYearId: activeYear.id.toString() }));
        }
      } else if (isStudent) {
        // Load data siswa
        const atpRes = await apiService.getAll("/atp/student/my-atp");
        setAtpList(atpRes.data || []);
      }
    } catch (err: any) {
      console.error("[Fetch ATP Data Error]", err);
      setError("Gagal memuat data. Pastikan koneksi internet stabil.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";

  // ══════════════════════════════════════════════
  // SUBJECT MANAGER FUNCTIONS
  // ══════════════════════════════════════════════

  const handleBindSubject = async () => {
    if (!selectedSubjectToBind) {
      toast.error("Pilih mata pelajaran terlebih dahulu.");
      return;
    }
    setActionLoading("bind-subject");
    try {
      await apiService.create("/atp/my-subjects", { subjectId: selectedSubjectToBind });
      toast.success("Mata pelajaran berhasil ditambahkan.");
      setSelectedSubjectToBind("");
      // Refresh subjects
      const subjectsRes = await apiService.getAll("/atp/my-subjects");
      setMySubjects(subjectsRes.data || []);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Gagal mengampu mata pelajaran.";
      toast.error(errMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnbindSubject = async (subjectId: number) => {
    if (!confirm("Apakah Anda yakin ingin melepas mata pelajaran ini dari daftar ampu?")) return;
    setActionLoading(`unbind-${subjectId}`);
    try {
      await api.delete(`/atp/my-subjects/${subjectId}`);
      toast.success("Mata pelajaran berhasil dilepas.");
      // Refresh subjects
      const subjectsRes = await apiService.getAll("/atp/my-subjects");
      setMySubjects(subjectsRes.data || []);
    } catch (err: any) {
      toast.error("Gagal melepas mata pelajaran.");
    } finally {
      setActionLoading(null);
    }
  };

  // ══════════════════════════════════════════════
  // RPS WIZARD SETUP FUNCTIONS
  // ══════════════════════════════════════════════

  const handleNextStep = () => {
    if (wizardStep === 1 && !wizardForm.academicYearId) {
      toast.error("Silakan pilih Tahun Ajaran & Semester.");
      return;
    }
    if (wizardStep === 2 && !wizardForm.subjectId) {
      toast.error("Silakan pilih Mata Pelajaran.");
      return;
    }
    if (wizardStep === 3 && !wizardForm.classId) {
      toast.error("Silakan pilih Kelas target.");
      return;
    }
    if (wizardStep === 4 && (!wizardForm.totalMeetings || wizardForm.totalMeetings < 1 || wizardForm.totalMeetings > 16)) {
  toast.error("Jumlah pertemuan harus antara 1 sampai 16 per semester.");
    }
    setWizardStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setWizardStep(prev => prev - 1);
  };

  const handleGenerateAtp = async () => {
    setActionLoading("generate-atp");
    try {
      const res = await apiService.create("/atp/generate", {
        subjectId: Number(wizardForm.subjectId),
        classId: Number(wizardForm.classId),
        academicYearId: Number(wizardForm.academicYearId),
        totalMeetings: Number(wizardForm.totalMeetings),
        learningObjective: wizardForm.learningObjective || null,
        learningStrategy: wizardForm.learningStrategy || null,
        teacherNote: wizardForm.teacherNote || null
      });

      toast.success(res.message || "ATP berhasil di-generate!");
      setIsWizardOpen(false);
      // Reset form & step
      setWizardStep(1);
      setWizardForm({
        academicYearId: "",
        subjectId: "",
        classId: "",
        totalMeetings: 16,
        learningObjective: "",
        learningStrategy: "",
        teacherNote: ""
      });
      // Fetch new list
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Gagal membuat ATP baru.";
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  // ══════════════════════════════════════════════
  // RPS ACTIONS (PUBLISH, ARCHIVE, DELETE, EXPORT)
  // ══════════════════════════════════════════════

  const handlePublishAtp = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin mempublikasikan ATP ini? Siswa di kelas terkait akan langsung dapat melihat seluruh detail dan materi pertemuan.")) return;
    setActionLoading(`publish-${id}`);
    try {
      await api.put(`/atp/${id}/publish`);
      toast.success("ATP berhasil dipublikasikan ke siswa!");
      fetchData();
    } catch (err) {
      toast.error("Gagal mempublikasikan ATP.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchiveAtp = async (id: number) => {
    if (!confirm("Arsipkan ATP ini? Status ATP akan berubah menjadi Archived.")) return;
    setActionLoading(`archive-${id}`);
    try {
      await api.put(`/atp/${id}/archive`);
      toast.success("ATP berhasil diarsipkan.");
      fetchData();
    } catch (err) {
      toast.error("Gagal mengarsipkan ATP.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAtp = async (id: number) => {
    if (!confirm("PERINGATAN! Menghapus ATP ini akan menghapus semua data pertemuan, data materi, dan log akses siswa yang terkait secara permanen. Apakah Anda benar-benar yakin?")) return;
    setActionLoading(`delete-${id}`);
    try {
      await api.delete(`/atp/${id}`);
      toast.success("ATP berhasil dihapus secara permanen.");
      fetchData();
    } catch (err) {
      toast.error("Gagal menghapus ATP.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadExcelTemplate = () => {
    const url = `/api/atp/template/excel`;
    window.open(url, "_blank");
  };

  const handleExportBundle = async (id: number, subjectName: string) => {
    try {
      const res = await apiService.getAll(`/atp/${id}/bundle`);
      if (res.success && res.data) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `ATP_Bundle_${subjectName.replace(/\s+/g, "_")}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        toast.success("Bundle ATP JSON berhasil diunduh.");
      }
    } catch (err) {
      toast.error("Gagal mengekspor bundle ATP.");
    }
  };

  const handleImportExcel = async () => {
    if (!importFile || !selectedAtpIdForImport) {
      toast.error("Silakan pilih file Excel template.");
      return;
    }
    setActionLoading("import-excel");
    try {
      const formData = new FormData();
      formData.append("excel", importFile);

      const res = await api.post(`/atp/${selectedAtpIdForImport}/import-excel`, formData);

      if (res.data?.success) {
        toast.success(res.data.message || "Import file Excel berhasil!");
        setIsImportModalOpen(false);
        setImportFile(null);
        setSelectedAtpIdForImport(null);
        fetchData();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Gagal mengimport file Excel.";
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  // Stats calculation
  const totalAtp = atpList.length;
  const publishedAtp = atpList.filter(r => r.status === "published").length;
  const draftAtp = atpList.filter(r => r.status === "draft").length;

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1591DC]/5 to-[#4BB8FA]/10 p-8 text-slate-800 shadow-sm border border-[#1591DC]/20">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#1591DC]/10 blur-2xl"></div>
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-[#4BB8FA]/10 blur-2xl"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1591DC]/10 px-3 py-1 text-xs font-semibold text-[#1591DC] backdrop-blur-sm">
              <Sparkles size={12} />
              Kurikulum Merdeka 2026
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              Alur Tujuan Pembelajaran (ATP)
            </h1>
            <p className="text-sm md:text-base text-slate-600 max-w-2xl font-light">
              {isTeacher
                ? "Generate struktur modul, atur alur & tujuan pembelajaran (ATP), rancang materi pertemuan, serta publikasikan langsung ke siswa Anda."
                : "Akses rencana pembelajaran semester, alur materi belajar, serta target capaian pembelajaran kelas Anda."}
            </p>
          </div>

          {isTeacher && (
            <div className="flex flex-wrap gap-3 shrink-0">
              <Button
                onClick={() => setIsSubjectManagerOpen(true)}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl flex items-center gap-2 transition-all font-medium px-4 h-11 shadow-sm"
              >
                <Settings size={18} />
                Kelola Mata Pelajaran ({mySubjects.length}/2)
              </Button>
              <Button
                onClick={() => {
                  if (mySubjects.length === 0) {
                    toast.error("Silakan daftarkan mata pelajaran yang Anda ampu terlebih dahulu.");
                    setIsSubjectManagerOpen(true);
                    return;
                  }
                  setIsWizardOpen(true);
                }}
                className="bg-[#1591DC] hover:bg-[#1591DC]/90 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-[#1591DC]/20 transition-all px-5 h-11 border-0"
              >
                <Plus size={20} className="stroke-[3px]" />
                Buat ATP Baru
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {isTeacher && totalAtp > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card className="p-6 bg-white border border-teal-50 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
              <Layers size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Rencana Semester</p>
              <p className="text-2xl font-black text-teal-950 mt-1">{totalAtp} ATP</p>
            </div>
          </Card>
          
          <Card className="p-6 bg-white border border-emerald-50 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
              <CheckCircle size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Terpublikasi ke Siswa</p>
              <p className="text-2xl font-black text-brand mt-1">{publishedAtp} Aktif</p>
            </div>
          </Card>

          <Card className="p-6 bg-white border border-amber-50 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
              <Calendar size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Draft / Belum Rilis</p>
              <p className="text-2xl font-black text-brand mt-1">{draftAtp} Modul</p>
            </div>
          </Card>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-brand" size={44} />
          <p className="text-muted-foreground animate-pulse text-sm">Memuat modul rencana pembelajaran...</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-4 p-5 bg-red-50 border border-red-100 rounded-2xl">
          <ShieldAlert size={24} className="text-red-500 shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-red-900 text-sm">Terjadi Kesalahan</h4>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
          <Button onClick={fetchData} variant="secondary" size="sm" className="h-9 px-4">
            <RefreshCw size={14} className="mr-1.5" /> Muat Ulang
          </Button>
        </div>
      ) : atpList.length === 0 ? (
        /* Empty State */
        <Card className="border-dashed border-2 border-brand/20 bg-brand/10/5 rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
          <div className="h-20 w-20 rounded-full bg-brand/10 flex items-center justify-center text-brand mb-6 shadow-inner">
            <ClipboardCheck size={38} />
          </div>
          <h3 className="text-xl font-bold text-teal-950 mb-2 tracking-tight">Belum Ada ATP Terdaftar</h3>
          <p className="text-muted-foreground text-sm max-w-md mb-8 leading-relaxed">
            {isTeacher
              ? "Anda belum membuat rencana pembelajaran untuk semester ini. Silakan daftarkan mata pelajaran yang Anda ampu lalu klik 'Buat ATP Baru'."
              : "Belum ada rencana pembelajaran semester yang dipublikasikan oleh guru pengampu di kelas Anda."}
          </p>
          {isTeacher && (
            <div className="flex gap-4">
              <Button onClick={() => setIsSubjectManagerOpen(true)} variant="secondary" className="rounded-xl px-5 h-11">
                Atur Mapel
              </Button>
              <Button
                onClick={() => {
                  if (mySubjects.length === 0) {
                    toast.error("Silakan daftarkan mata pelajaran yang Anda ampu terlebih dahulu.");
                    setIsSubjectManagerOpen(true);
                    return;
                  }
                  setIsWizardOpen(true);
                }}
                className="bg-brand hover:bg-brand text-white rounded-xl px-5 h-11"
              >
                Buat ATP Sekarang
              </Button>
            </div>
          )}
        </Card>
      ) : (
        /* ATP List Grid */
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-teal-50 pb-3">
            <h2 className="font-extrabold text-teal-950 flex items-center gap-2 tracking-tight font-bold">
              <BookOpen size={20} className="text-brand" />
              Modul Aktif
            </h2>
            <span className="text-xs font-semibold text-muted-foreground bg-slate-50 border border-gray-100 rounded-full px-3 py-1">
              Menampilkan {atpList.length} rencana
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {atpList.map((atp) => {
              const statusColors = {
                draft: "bg-brand/10 text-brand border-brand/20",
                published: "bg-brand/10 text-brand border-brand/20",
                archived: "bg-slate-100 text-slate-800 border-slate-200"
              };

              return (
                  <Card
                  key={atp.id}
                  className="bg-white border border-brand/20/50 rounded-2xl shadow-sm hover:shadow-md hover:border-brand/20 transition-all duration-300 flex flex-col group relative overflow-hidden"
                >
                  {/* Status Tag */}
                  <div className="absolute right-4 top-4 z-10">
                    <Badge variant="neutral" className={`capitalize rounded-full font-bold px-2.5 py-0.5 text-[10px] ${statusColors[atp.status as keyof typeof statusColors]}`}>
                      {atp.status}
                    </Badge>
                  </div>

                  <div className="p-6 flex-1 flex flex-col space-y-4">
                    {/* Header */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-brand uppercase tracking-widest block">
                        {atp.academicYear?.name || "Tahun Ajaran"} • {atp.academicYear?.semester === "odd" ? "Ganjil" : "Genap"}
                      </span>
                      <h3 className="text-lg font-bold text-teal-950 line-clamp-1 group-hover:text-brand transition-colors pr-16 tracking-tight">
                        {atp.subject?.name || "Mata Pelajaran"}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Layers size={13} className="text-brand" />
                        <span>Kelas: <strong className="text-brand font-semibold">{atp.class?.name || "Semua Kelas"}</strong></span>
                        <span className="mx-1">•</span>
                        <span>{atp.totalMeetings || 16} Pertemuan</span>
                      </div>
                    </div>

                    {/* Nomor Induk (MOD / ATP) */}
                    <div className="bg-brand/10/30 border border-brand/20/40 rounded-xl p-3 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-light">No ATP:</span>
                        <span className="font-mono text-teal-950 font-bold">{atp.nomorInduk1}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-light">No Modul:</span>
                        <span className="font-mono text-teal-950 font-bold">{atp.nomorInduk2}</span>
                      </div>
                    </div>

                    {/* Objective preview */}
                    {atp.learningObjective && (
                      <p className="text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed italic bg-slate-50/50 p-2.5 rounded-lg border border-gray-100">
                        "{atp.learningObjective}"
                      </p>
                    )}

                    {/* Student teacher label */}
                    {!isTeacher && atp.teacher && (
                      <div className="flex items-center gap-2 border-t border-teal-50/70 pt-3">
                        <div className="h-6 w-6 rounded-full bg-brand/10 flex items-center justify-center text-[10px] font-bold text-brand">
                          {atp.teacher.name.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-teal-950 truncate">Guru: {atp.teacher.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="bg-brand/10/10 border-t border-teal-50 p-4 flex flex-wrap gap-2 items-center justify-between shrink-0">
                    <Link href={`/hub/atp/${atp.id}`} className="flex-1 min-w-[80px]">
                      <Button size="sm" className="w-full bg-brand hover:bg-brand text-white rounded-xl text-xs font-bold gap-1 px-3">
                        <Eye size={13} />
                        Kelola
                      </Button>
                    </Link>

                    {isTeacher && (
                      <div className="flex items-center gap-1">
                        {atp.status === "draft" && (
                          <Button
                            onClick={() => handlePublishAtp(atp.id)}
                            disabled={actionLoading === `publish-${atp.id}`}
                            variant="secondary"
                            size="sm"
                            className="bg-brand/10 hover:bg-brand/10 text-brand border border-brand/20 rounded-xl text-[11px] font-semibold px-2.5 h-8"
                          >
                            {actionLoading === `publish-${atp.id}` ? <Loader2 className="animate-spin h-3 w-3" /> : "Publish"}
                          </Button>
                        )}

                        {atp.status === "published" && (
                          <Button
                            onClick={() => handleArchiveAtp(atp.id)}
                            disabled={actionLoading === `archive-${atp.id}`}
                            variant="secondary"
                            size="sm"
                            className="bg-brand/10 hover:bg-brand/10 text-brand border border-brand/20 rounded-xl text-[11px] font-semibold px-2.5 h-8"
                          >
                            Archive
                          </Button>
                        )}

                        {/* Excel Tools */}
                        <Button
                          onClick={() => {
                            setSelectedAtpIdForImport(atp.id);
                            setIsImportModalOpen(true);
                          }}
                          variant="secondary"
                          size="sm"
                          title="Import data pertemuan dari Excel"
                          className="h-8 w-8 p-0 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700"
                        >
                          <Upload size={13} />
                        </Button>

                        <Button
                          onClick={() => handleExportBundle(atp.id, atp.subject.name)}
                          variant="secondary"
                          size="sm"
                          title="Download bundle ATP JSON"
                          className="h-8 w-8 p-0 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700"
                        >
                          <FileJson size={13} />
                        </Button>

                        <Button
                          onClick={() => handleDeleteAtp(atp.id)}
                          disabled={actionLoading === `delete-${atp.id}`}
                          variant="secondary"
                          size="sm"
                          title="Hapus ATP permanen"
                          className="h-8 w-8 p-0 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl"
                        >
                          {actionLoading === `delete-${atp.id}` ? <Loader2 className="animate-spin" size={13} /> : <Trash2 size={13} />}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Quick Helper Banner for Teachers */}
          {isTeacher && (
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-brand/20/55 rounded-2xl p-5 mt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-brand text-white rounded-xl flex items-center justify-center shadow-md">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-teal-950 text-sm">Alat Kelola Massal via Excel</h4>
                  <p className="text-xs text-muted-foreground">Download template standar ATP Maleo, isi rencana pertemuan, lalu unggah kembali.</p>
                </div>
              </div>
              <Button
                onClick={handleDownloadExcelTemplate}
                className="bg-white hover:bg-brand/10 border border-brand/20 text-brand text-xs font-bold rounded-xl flex items-center gap-2 h-9 px-4 shrink-0 shadow-sm"
              >
                <Download size={14} /> Download Template Excel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────
          MODAL 1: SUBJECT MANAGER (Mata Pelajaran Guru)
          ────────────────────────────────────────────── */}
      <Modal isOpen={isSubjectManagerOpen} onClose={() => setIsSubjectManagerOpen(false)} title="Kelola Mata Pelajaran (Max 2)">
        <div className="p-6 space-y-6">
          <div className="bg-brand/10/50 border border-brand/20/50 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-brand uppercase tracking-widest flex items-center gap-1.5">
              <UserCheck size={14} className="text-brand" />
              Sistem Pembatasan Guru
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
        Guru di SIAKAD Maleo dibatasi mengampu maksimal <strong>2 mata pelajaran</strong> secara bersamaan. Pendaftaran ini dibutuhkan agar Anda dapat men-generate rencana ATP.
            </p>
          </div>

          {/* Bind Subject Form */}
          {mySubjects.length < 2 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-teal-950">Tambahkan Mapel Ampu</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    id="selectedSubjectToBind"
                    name="selectedSubjectToBind"
                    placeholder="Pilih Mata Pelajaran"
                    value={selectedSubjectToBind}
                    onChange={(e) => setSelectedSubjectToBind(e.target.value)}
                    options={[
                      { value: "", label: "Pilih Mata Pelajaran" },
                      ...allSubjects
                        .filter(s => !mySubjects.some(ms => ms.id === s.id))
                        .map(s => ({ value: s.id.toString(), label: `[Grade ${s.gradeLevel}] ${s.name} (${s.code})` }))
                    ]}
                  />
                </div>
                <Button
                  onClick={handleBindSubject}
                  disabled={actionLoading === "bind-subject"}
                  className="bg-brand hover:bg-brand text-white rounded-xl px-4 shrink-0 font-bold text-sm h-[42px]"
                >
                  {actionLoading === "bind-subject" ? <Loader2 className="animate-spin h-4 w-4" /> : "Tambahkan"}
                </Button>
              </div>
            </div>
          )}

          {/* List Current Binded Subjects */}
          <div className="space-y-3">
            <h4 className="font-bold text-teal-950 text-xs uppercase tracking-wider">Mapel Yang Sedang Diamampu</h4>
            <div className="divide-y divide-teal-50 border border-teal-50 rounded-2xl overflow-hidden bg-white">
              {mySubjects.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground italic">
                  Belum ada mata pelajaran yang didaftarkan.
                </div>
              ) : (
                mySubjects.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-4 group hover:bg-brand/10/10">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-brand/10 text-brand rounded-lg flex items-center justify-center text-xs font-bold">
                        {sub.code.substring(0, 3)}
                      </div>
                      <div>
                        <h5 className="font-bold text-teal-950 text-sm">{sub.name}</h5>
                        <p className="text-[10px] text-muted-foreground">Kode: {sub.code} • Tingkat: Kelas {sub.gradeLevel}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnbindSubject(sub.id)}
                      disabled={actionLoading === `unbind-${sub.id}`}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Lepas Mapel"
                    >
                      {actionLoading === `unbind-${sub.id}` ? <Loader2 className="animate-spin h-3 w-3" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-teal-50">
            <Button onClick={() => setIsSubjectManagerOpen(false)} className="bg-brand hover:bg-brand text-white rounded-xl">
              Selesai
            </Button>
          </div>
        </div>
      </Modal>

      {/* ──────────────────────────────────────────────
          MODAL 2: SETUP WIZARD (Generate ATP)
          ────────────────────────────────────────────── */}
      <Modal isOpen={isWizardOpen} onClose={() => !actionLoading && setIsWizardOpen(false)} title="Wizard Pembuatan ATP Baru">
        <div className="p-6 space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-6 w-6 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold shadow-md shadow-brand/20">
                {wizardStep}
              </span>
              <span className="text-xs font-bold text-teal-950">Langkah {wizardStep} dari 6</span>
            </div>
            <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-light to-brand transition-all duration-300"
                style={{ width: `${(wizardStep / 6) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* STEP 1: Academic Year */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-extrabold text-teal-950 text-base tracking-tight font-bold">Tahun Ajaran & Semester</h3>
                <p className="text-xs text-muted-foreground">Pilih periode aktif untuk pembuatan ATP ini.</p>
              </div>
              <SearchableSelect
                id="wizardYear"
                name="wizardYear"
                placeholder="Pilih Tahun Ajaran"
                value={wizardForm.academicYearId}
                onChange={(e) => setWizardForm({ ...wizardForm, academicYearId: e.target.value })}
                options={[
                  { value: "", label: "Pilih Tahun Ajaran" },
                  ...academicYears.map(y => ({
                    value: y.id.toString(),
                    label: `${y.name} - Semester ${y.semester === "odd" ? "Ganjil" : "Genap"} ${y.isActive ? "(Aktif)" : ""}`
                  }))
                ]}
              />
            </div>
          )}

          {/* STEP 2: Subject */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-extrabold text-teal-950 text-base tracking-tight font-bold">Pilih Mata Pelajaran</h3>
                <p className="text-xs text-muted-foreground">Mata pelajaran yang Anda ampu yang akan dibuatkan ATP.</p>
              </div>
              <SearchableSelect
                id="wizardSubject"
                name="wizardSubject"
                placeholder="Pilih Mata Pelajaran"
                value={wizardForm.subjectId}
                onChange={(e) => setWizardForm({ ...wizardForm, subjectId: e.target.value })}
                options={[
                  { value: "", label: "Pilih Mata Pelajaran" },
                  ...mySubjects.map(s => ({
                    value: s.id.toString(),
                    label: `[Tingkat ${s.gradeLevel}] ${s.name} (${s.code})`
                  }))
                ]}
              />
              {mySubjects.length === 0 && (
                <p className="text-xs text-red-500 italic">Belum ada mapel ampu. Hubungkan dulu di tombol atur mapel.</p>
              )}
            </div>
          )}

          {/* STEP 3: Class */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-extrabold text-teal-950 text-base tracking-tight font-bold">Target Kelas</h3>
                <p className="text-xs text-muted-foreground">Pilih kelas yang akan dikaitkan dengan rencana ini.</p>
              </div>
              {(() => {
                // Filter kelas berdasarkan grade level dari subject yang dipilih
                const selectedSubject = mySubjects.find(s => s.id.toString() === wizardForm.subjectId);
                const targetGradeLevel = selectedSubject?.gradeLevel;
                const filteredClasses = targetGradeLevel
                  ? classes.filter(c => c.level === targetGradeLevel)
                  : classes;
                return (
                  <SearchableSelect
                    id="wizardClass"
                    name="wizardClass"
                    placeholder={filteredClasses.length === 0
                      ? `Tidak ada kelas tingkat ${targetGradeLevel} tersedia`
                      : "Pilih Kelas"}
                    value={wizardForm.classId}
                    onChange={(e) => setWizardForm({ ...wizardForm, classId: e.target.value })}
                    options={[
                      { value: "", label: filteredClasses.length === 0 ? `Tidak ada kelas tingkat ${targetGradeLevel} tersedia` : "Pilih Kelas" },
                      ...filteredClasses.map(c => ({
                        value: c.id.toString(),
                        label: `Kelas ${c.name} (Tingkat ${c.level})`
                      }))
                    ]}
                  />
                );
              })()}
              {(() => {
                const selectedSubject = mySubjects.find(s => s.id.toString() === wizardForm.subjectId);
                const targetGradeLevel = selectedSubject?.gradeLevel;
                const filteredClasses = targetGradeLevel
                  ? classes.filter(c => c.level === targetGradeLevel)
                  : classes;
                return filteredClasses.length === 0 && targetGradeLevel ? (
                  <p className="text-xs text-amber-600 italic bg-amber-50 border border-amber-200 rounded-xl p-3">
                    ⚠️ Mata pelajaran ini untuk tingkat {targetGradeLevel}, namun tidak ada kelas dengan tingkat {targetGradeLevel} di sistem. 
                    Silakan hubungi admin untuk menambahkan kelas.
                  </p>
                ) : null;
              })()}
            </div>
          )}

          {/* STEP 4: Meetings count */}
          {wizardStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-extrabold text-teal-950 text-base tracking-tight font-bold">Jumlah Pertemuan</h3>
                <p className="text-xs text-muted-foreground">Jumlah tatap muka dalam semester (Standar: 16 pertemuan termasuk PSTS & PSAS).</p>
              </div>
           <input
                type="number"
                min="1"
                max="16"
                placeholder="Contoh: 12"
                className="w-full rounded-xl border border-brand/20 p-3 text-xs focus:ring-2 focus:ring-brand transition-all"
                value={wizardForm.totalMeetings}
                onChange={(e) => setWizardForm({...wizardForm, totalMeetings: parseInt(e.target.value) || 16})}
              />
            </div>
          )}

          {/* STEP 5: Detail & Rincian */}
          {wizardStep === 5 && (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              <div className="space-y-2">
                <h3 className="font-extrabold text-teal-950 text-base tracking-tight font-bold">Rincian Tambahan</h3>
                <p className="text-xs text-muted-foreground">Tuliskan ringkasan alur, strategi, dan catatan kurikulum Merdeka.</p>
              </div>
              
              <div className="space-y-1">
                <label className="block text-xs font-bold text-teal-950">Tujuan Capaian Pembelajaran (CP / ATP)</label>
                <textarea
                  className="w-full rounded-xl border border-brand/20 p-3 text-xs focus:ring-2 focus:ring-brand transition-all"
                  rows={3}
                  placeholder="Contoh: Siswa mampu memecahkan persamaan linear satu variabel..."
                  value={wizardForm.learningObjective}
                  onChange={(e) => setWizardForm({ ...wizardForm, learningObjective: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-teal-950">Strategi Pembelajaran Semester</label>
                <textarea
                  className="w-full rounded-xl border border-brand/20 p-3 text-xs focus:ring-2 focus:ring-brand transition-all"
                  rows={3}
                  placeholder="Contoh: Diskusi aktif, Flipped Classroom, Eksplorasi Geogebra..."
                  value={wizardForm.learningStrategy}
                  onChange={(e) => setWizardForm({ ...wizardForm, learningStrategy: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-teal-950">Catatan Khusus Pengajar</label>
                <textarea
                  className="w-full rounded-xl border border-brand/20 p-3 text-xs focus:ring-2 focus:ring-brand transition-all"
                  rows={2}
                  placeholder="Contoh: Memerlukan ruang lab komputer untuk pertemuan 8..."
                  value={wizardForm.teacherNote}
                  onChange={(e) => setWizardForm({ ...wizardForm, teacherNote: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* STEP 6: Confirmation */}
          {wizardStep === 6 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-extrabold text-teal-950 text-base tracking-tight font-bold">Konfirmasi Akhir</h3>
                <p className="text-xs text-muted-foreground">Periksa rincian data sebelum memproses auto-generate.</p>
              </div>

              <div className="bg-brand/10/40 border border-brand/20 rounded-2xl p-4 text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tahun Ajaran:</span>
                  <span className="font-bold text-teal-950">
                    {academicYears.find(y => y.id.toString() === wizardForm.academicYearId)?.name || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Semester:</span>
                  <span className="font-bold text-teal-950">
                    {academicYears.find(y => y.id.toString() === wizardForm.academicYearId)?.semester === "odd" ? "Ganjil" : "Genap"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mata Pelajaran:</span>
                  <span className="font-bold text-teal-950">
                    {mySubjects.find(s => s.id.toString() === wizardForm.subjectId)?.name || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Kelas:</span>
                  <span className="font-bold text-teal-950">
                    {classes.find(c => c.id.toString() === wizardForm.classId)?.name || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jumlah Pertemuan:</span>
                  <span className="font-bold text-brand">{wizardForm.totalMeetings} Sesi (Auto-generated)</span>
                </div>
              </div>

              <div className="bg-brand/10 border border-brand/20 rounded-xl p-3 flex items-start gap-2 text-[11px] text-brand">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <p>Auto-generate akan otomatis membuat data {wizardForm.totalMeetings} pertemuan kosong di dalam database yang bisa Anda isi bertahap atau di-import sekaligus via Excel.</p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-teal-50">
            {wizardStep > 1 ? (
              <Button variant="secondary" onClick={handlePrevStep} disabled={!!actionLoading} className="rounded-xl flex items-center gap-1">
                <ArrowLeft size={16} /> Kembali
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setIsWizardOpen(false)} disabled={!!actionLoading} className="rounded-xl">
                Batal
              </Button>
            )}

            {wizardStep < 6 ? (
              <Button onClick={handleNextStep} className="bg-brand hover:bg-brand text-white rounded-xl flex items-center gap-1">
                Lanjut <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                onClick={handleGenerateAtp}
                disabled={actionLoading === "generate-atp"}
                className="bg-gradient-to-r from-brand-light to-brand hover:from-brand-light hover:to-brand text-white rounded-xl px-6 font-bold shadow-lg shadow-brand/20"
              >
                {actionLoading === "generate-atp" ? <Loader2 className="animate-spin mr-1.5 h-4 w-4" /> : "Proses Generate"}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* ──────────────────────────────────────────────
          MODAL 3: IMPORT EXCEL
          ────────────────────────────────────────────── */}
      <Modal isOpen={isImportModalOpen} onClose={() => !actionLoading && setIsImportModalOpen(false)} title="Import Data Sesi Pertemuan">
        <div className="p-6 space-y-6">
          <div className="bg-brand/10/50 border border-brand/20/50 rounded-2xl p-4 flex gap-3 text-xs text-brand leading-relaxed">
            <FileSpreadsheet size={20} className="text-brand shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-teal-950">Gunakan Template Standar</h5>
              <p className="text-muted-foreground mt-0.5">
                Pastikan Anda menggunakan file Excel template yang diunduh dari tombol template standar. Jangan mengubah susunan kolom ("No Pertemuan", "Judul Pertemuan", "Alur Pembelajaran", "Tujuan Pembelajaran", "Aktivitas", "Penilaian").
              </p>
            </div>
          </div>

          <div className="border-2 border-dashed border-brand/20 hover:border-brand/20 rounded-2xl p-8 text-center bg-slate-50/50 relative cursor-pointer group transition-all duration-300">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="import-excel-file"
            />
            <div className="space-y-2">
              <div className="h-12 w-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-sm">
                <Upload size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-teal-950">
                  {importFile ? importFile.name : "Klik atau seret file Excel di sini"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : "Maksimal ukuran file 10MB (.xlsx, .xls)"}
                </p>
              </div>
            </div>
          </div>

          {importFile && (
            <div className="flex items-center justify-between bg-brand/10 border border-brand/20/60 rounded-xl p-3 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-brand shrink-0" />
                <span className="font-medium text-brand truncate max-w-[200px]">{importFile.name}</span>
              </div>
              <button
                onClick={() => setImportFile(null)}
                className="text-muted-foreground hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-teal-50">
            <Button
              variant="secondary"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportFile(null);
                setSelectedAtpIdForImport(null);
              }}
              disabled={!!actionLoading}
              className="rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleImportExcel}
              disabled={actionLoading === "import-excel" || !importFile}
              className="bg-brand hover:bg-brand text-white rounded-xl font-bold px-5"
            >
              {actionLoading === "import-excel" ? <Loader2 className="animate-spin mr-1.5 h-4 w-4" /> : "Unggah & Proses"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
