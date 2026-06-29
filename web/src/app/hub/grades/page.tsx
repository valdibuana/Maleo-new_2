"use client";

import React, { useState, useEffect } from "react";
import {
  Award,
  Plus,
  Loader2,
  Trash2,
  BookOpen,
  X,
  TrendingUp,
  Target,
  BarChart3,
  Filter,
  Lock,
  Unlock,
  CheckCircle2,
  Calculator,
  Settings,
  Pencil,
  Upload,
  FileSpreadsheet
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { apiService } from "@/services/apiService";
import { formatDate, cn } from "@/lib/utils";

const GRADE_TYPES = [
  { value: "Tugas", label: "Tugas" },
  { value: "PSTS", label: "PSTS — Sumatif Tengah Semester" },
  { value: "PSAS", label: "PSAS — Sumatif Akhir Semester" },
  { value: "Kuis", label: "Kuis" },
];

const getGradeBadge = (score: number, max: number = 100) => {
  const pct = (score / max) * 100;
  if (pct >= 80) return { cls: "bg-brand/10 text-brand border-brand/20", label: "Baik" };
  if (pct >= 60) return { cls: "bg-brand/10 text-brand border-brand/20", label: "Cukup" };
  return { cls: "bg-rose-100 text-rose-700 border-rose-200", label: "Kurang" };
};

const getScoreColor = (score: number, max: number = 100) => {
  const pct = (score / max) * 100;
  if (pct >= 80) return "text-brand";
  if (pct >= 60) return "text-brand";
  return "text-rose-600";
};

const getTypeBadgeColor = (type: string) => {
  switch (type) {
    case "Tugas": return "bg-brand/10 text-brand";
    case "PSTS": return "bg-violet-100 text-violet-700";
    case "PSAS": return "bg-fuchsia-100 text-fuchsia-700";
    case "Kuis": return "bg-cyan-100 text-cyan-700";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function GradesPage() {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  // Filters
  const [filterSubject, setFilterSubject] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterType, setFilterType] = useState("");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingGrade, setEditingGrade] = useState<any>(null);
  
  const [form, setForm] = useState({
    studentId: "",
    subjectId: "",
    type: "",
    score: "",
    maxScore: "100",
    date: new Date().toISOString().split("T")[0],
  });

  // State Baru: Locking & Bobot
  const [lockedGradeIds, setLockedGradeIds] = useState<Set<number>>(new Set());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [gradeConfig, setGradeConfig] = useState<any>(null);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [weightComponents, setWeightComponents] = useState<any[]>([]);
  const [gradeSummary, setGradeSummary] = useState<any>(null);

  // Upload Excel states
  const [uploadGradeFile, setUploadGradeFile] = useState<File | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const teacher = parsed.role === "teacher";
        setIsTeacher(teacher);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (isTeacher) {
      fetchTeacherFilters();
    } else {
      fetchStudentSubjects();
    }
    fetchGrades();
  }, [isTeacher]);

  useEffect(() => {
    if (isTeacher && filterClass && filterSubject) {
      fetchGradeConfig();
      fetchGradeSummary();
    } else {
      setGradeConfig(null);
      setGradeSummary(null);
    }
  }, [filterClass, filterSubject]);

  const fetchStudentSubjects = async () => {
    try {
      const res = await apiService.getAll("/hub/student-subjects");
      setSubjects(res.data || []);
    } catch (e) {}
  };

  const fetchTeacherFilters = async () => {
    try {
      const [subsRes, classesRes] = await Promise.all([
        apiService.getAll("/hub/teacher-subjects"),
        apiService.getAll("/hub/teacher-classes"),
      ]);
      setSubjects(subsRes.data || []);
      setClasses(classesRes.data || []);
    } catch (e) {}
  };

  const fetchStudentsForClass = async (classId: string) => {
    if (!classId) { setStudents([]); return; }
    try {
      const res = await apiService.getById("/classes", classId);
      setStudents(res.data?.students || []);
    } catch (e) {}
  };

  const fetchGrades = async (params?: Record<string, string>) => {
    setLoading(true);
    setError("");
    try {
      const query: any = {};
      if (params?.subjectId) query.subjectId = params.subjectId;
      if (params?.classId) query.classId = params.classId;
      if (params?.type) query.type = params.type;
      else {
        if (filterSubject) query.subjectId = filterSubject;
        if (filterClass) query.classId = filterClass;
        if (filterType) query.type = filterType;
      }

      const res = await apiService.getAll("/hub/grades", query);
      const data = res.data || [];
      setGrades(data);
      
      const locked = new Set<number>();
      data.forEach((g: any) => {
        if (g.isLocked) locked.add(g.id);
      });
      setLockedGradeIds(locked);
    } catch (e) {
      setError("Gagal memuat data nilai.");
    } finally {
      setLoading(false);
    }
  };

  const fetchGradeConfig = async () => {
    if (!filterClass || !filterSubject) return;

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const classObj = classes.find((c: any) => String(c.id) === filterClass);
      const subjectObj = subjects.find((s: any) => String(s.id) === filterSubject);

      if (!classObj || !subjectObj || !user.teacherId) return;

      const res = await apiService.getAll("/grade-config", {
        teacherId: user.teacherId,
        subjectId: subjectObj.id,
        classId: classObj.id,
      });
      
      setGradeConfig(res.data);
      setWeightComponents(res.data.components || []);
    } catch (err) {
      console.error("Gagal fetch grade config", err);
    }
  };

  const fetchGradeSummary = async () => {
    if (!filterClass || !filterSubject) return;

    try {
      const classObj = classes.find((c: any) => String(c.id) === filterClass);
      const subjectObj = subjects.find((s: any) => String(s.id) === filterSubject);

      if (!classObj || !subjectObj) return;

      const res = await apiService.getAll("/grade-config/summary", {
        subjectId: subjectObj.id,
        classId: classObj.id,
      });
      
      setGradeSummary(res.data);
    } catch (err) {
      console.error("Gagal fetch grade summary", err);
    }
  };

  const applyFilters = () => {
    fetchGrades({
      subjectId: filterSubject,
      classId: filterClass,
      type: filterType,
    });
  };

  const openAdd = () => {
    setEditingGrade(null);
    setForm({ studentId: "", subjectId: "", type: "", score: "", maxScore: "100", date: new Date().toISOString().split("T")[0] });
    setIsModalOpen(true);
  };

  const openEdit = (grade: any) => {
    if (lockedGradeIds.has(grade.id) || grade.isLocked) {
      alert("Nilai yang sudah dikunci tidak bisa diedit.");
      return;
    }
    setEditingGrade(grade);
    if (isTeacher) {
      setFilterClass(String(grade.student.class?.id || filterClass));
      fetchStudentsForClass(String(grade.student.class?.id || filterClass));
    }
    setForm({
      studentId: String(grade.studentId),
      subjectId: String(grade.subjectId),
      type: grade.type,
      score: String(grade.score),
      maxScore: String(grade.maxScore || "100"),
      date: new Date(grade.date).toISOString().split("T")[0],
    });
    setIsModalOpen(true);
  };

  const handleSaveGradeWithConfirm = () => {
    if (!form.studentId || !form.subjectId || !form.type || !form.score) {
      alert("Harap lengkapi semua field yang diperlukan.");
      return;
    }
    if (Number(form.score) > Number(form.maxScore)) {
      alert("Nilai tidak boleh melebihi nilai maksimal.");
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    setIsSubmitting(true);
    
    try {
      let savedGrade;
      const payload = {
        studentId: Number(form.studentId),
        subjectId: Number(form.subjectId),
        type: form.type,
        score: Number(form.score),
        maxScore: Number(form.maxScore) || 100,
        date: form.date,
      };

      if (editingGrade) {
        if (lockedGradeIds.has(editingGrade.id)) {
          alert("Nilai yang sudah dikunci tidak bisa diedit.");
          setIsSubmitting(false);
          return;
        }
        // Endpoint put yang digunakan di grades route, asumsi frontend pake PUT /grades/:id
        // Karena route di hub cuma ada POST & DELETE, kita ganti ke route utama jika API update ada di sana
        // Wait, route /api/hub/grades tidak punya PUT. Tapi /api/grades punya PUT.
        const res = await apiService.update("/grades", editingGrade.id, payload);
        savedGrade = res.data;
        setSuccessMsg("Nilai berhasil diperbarui.");
      } else {
        const res = await apiService.create("/hub/grades", payload);
        savedGrade = res.data;
        setSuccessMsg("Nilai berhasil disimpan.");
      }

      // Auto-lock setelah simpan
      if (savedGrade?.id) {
        await apiService.create(`/hub/grades/${savedGrade.id}/lock`, {});
        setLockedGradeIds(prev => {
          const newSet = new Set(prev);
          newSet.add(savedGrade.id);
          return newSet;
        });
      }

      fetchGrades();
      if (filterClass && filterSubject) {
        fetchGradeSummary();
      }
      setIsModalOpen(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e: any) {
      alert(e.response?.data?.message || "Gagal menyimpan nilai.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGrade = async (id: number) => {
    if (lockedGradeIds.has(id)) {
      alert("Nilai sudah dikunci, tidak bisa dihapus.");
      return;
    }
    if (!confirm("Hapus nilai ini?")) return;
    try {
      await apiService.remove("/hub/grades", id);
      setSuccessMsg("Nilai berhasil dihapus.");
      fetchGrades();
      if (filterClass && filterSubject) {
        fetchGradeSummary();
      }
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e: any) {
      alert(e.response?.data?.message || "Gagal menghapus nilai.");
    }
  };

  const handleSaveWeightConfig = async () => {
    if (!gradeConfig) return;

    const total = weightComponents.reduce(
      (sum: number, c: any) => sum + Number(c.weight), 0
    );

    if (Math.round(total) !== 100) {
      alert(`Total bobot harus 100%. Saat ini: ${total.toFixed(1)}%`);
      return;
    }

    try {
      await apiService.update("/grade-config", gradeConfig.id, {
        components: weightComponents
      });
      setSuccessMsg("Konfigurasi bobot berhasil disimpan.");
      setIsWeightModalOpen(false);
      fetchGradeConfig();
      fetchGradeSummary();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyimpan konfigurasi.");
    }
  };

  const handleUploadGrades = () => {
    if (!uploadGradeFile) return;
    console.log("[Upload Nilai] File selected:", uploadGradeFile.name, "Size:", uploadGradeFile.size, "bytes");
    alert(`File "${uploadGradeFile.name}" siap di-upload. Fitur import nilai akan segera tersedia.`);
    setUploadGradeFile(null);
  };

  // Student stats
  const avgScore = grades.length > 0
    ? grades.reduce((a, g) => a + (g.score / (g.maxScore || 100)) * 100, 0) / grades.length
    : 0;
  const highest = grades.length > 0 ? Math.max(...grades.map(g => (g.score / (g.maxScore || 100)) * 100)) : 0;
  const lowest = grades.length > 0 ? Math.min(...grades.map(g => (g.score / (g.maxScore || 100)) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {isTeacher ? "Manajemen Nilai" : "Nilai Saya"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isTeacher
              ? "Input dan kelola nilai tugas, PSTS, serta PSAS siswa"
              : "Rekap nilai semua mata pelajaran Anda"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {isTeacher && filterClass && filterSubject && (
            <Button
              variant="secondary"
              onClick={() => setIsWeightModalOpen(true)}
              className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
            >
              <Settings size={16} />
              Setup Bobot
            </Button>
          )}
          {isTeacher && (
            <Button onClick={openAdd}>
              <Plus size={16} />
              Input Nilai Baru
            </Button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-brand/10 border border-brand/20 text-brand rounded-lg flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")}><X size={16} /></button>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {/* Upload Excel Section for Grades (Teacher only) */}
      {isTeacher && (
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileSpreadsheet size={18} className="text-brand" />
              <span>Import Nilai dari Excel/CSV:</span>
            </div>
            <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setUploadGradeFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 file:cursor-pointer cursor-pointer"
              />
              <Button
                size="sm"
                onClick={handleUploadGrades}
                disabled={!uploadGradeFile}
              >
                <Upload size={16} />
                Upload
              </Button>
            </div>
            {uploadGradeFile && (
              <p className="text-xs text-muted-foreground">File: {uploadGradeFile.name}</p>
            )}
          </div>
        </Card>
      )}

      {/* Student Summary Cards */}
      {!isTeacher && grades.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 border-l-4 border-l-indigo-600">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rata-rata</p>
                <p className="text-4xl font-black text-brand mt-1">{Math.round(avgScore)}</p>
                <p className="text-xs text-muted-foreground mt-1">dari 100</p>
              </div>
              <div className="p-3 rounded-xl bg-brand/10 text-brand"><BarChart3 size={22} /></div>
            </div>
          </Card>
          <Card className="p-5 border-l-4 border-l-emerald-600">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tertinggi</p>
                <p className="text-4xl font-black text-brand mt-1">{Math.round(highest)}</p>
                <p className="text-xs text-muted-foreground mt-1">nilai terbaik</p>
              </div>
              <div className="p-3 rounded-xl bg-brand/10 text-brand"><TrendingUp size={22} /></div>
            </div>
          </Card>
          <Card className="p-5 border-l-4 border-l-amber-600">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Terendah</p>
                <p className="text-4xl font-black text-brand mt-1">{Math.round(lowest)}</p>
                <p className="text-xs text-muted-foreground mt-1">perlu ditingkatkan</p>
              </div>
              <div className="p-3 rounded-xl bg-brand/10 text-brand"><Target size={22} /></div>
            </div>
          </Card>
        </div>
      )}

      {/* Formula bobot */}
      {isTeacher && gradeConfig && (
        <div className="flex items-center gap-2 p-3 bg-violet-50 border border-violet-100 rounded-lg">
          <Calculator size={16} className="text-violet-600 shrink-0" />
          <p className="text-sm text-violet-700">
            <span className="font-medium">Formula Nilai Akhir: </span>
            {gradeConfig.formula}
          </p>
          {!gradeConfig.isValid && (
            <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">
              Bobot belum valid!
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mr-2">
            <Filter size={16} /> Filter:
          </div>
          {subjects.length > 0 && (
            <div className="w-44">
              <SearchableSelect
                placeholder="Semua Mapel"
                options={[
                  { value: "", label: "Semua Mapel" },
                  ...subjects.map(s => ({ value: String(s.id), label: s.name }))
                ]}
                value={filterSubject}
                onChange={e => setFilterSubject(e.target.value)}
              />
            </div>
          )}
          {isTeacher && classes.length > 0 && (
            <div className="w-40">
              <SearchableSelect
                placeholder="Semua Kelas"
                options={[
                  { value: "", label: "Semua Kelas" },
                  ...classes.map(c => ({ value: String(c.id), label: c.name }))
                ]}
                value={filterClass}
                onChange={e => {
                  setFilterClass(e.target.value);
                  fetchStudentsForClass(e.target.value);
                }}
              />
            </div>
          )}
          <div className="w-44">
            <Select
              placeholder="Semua Tipe"
              options={GRADE_TYPES}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={applyFilters}>Terapkan</Button>
          {(filterSubject || filterClass || filterType) && (
            <Button size="sm" variant="secondary" onClick={() => {
              setFilterSubject(""); setFilterClass(""); setFilterType("");
              setTimeout(fetchGrades, 0);
            }}>
              Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {isTeacher && (
                  <>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Nama Siswa</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">NIS</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Kelas</th>
                  </>
                )}
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Mata Pelajaran</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Tipe</th>
                <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Nilai</th>
                <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Persentase</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Tanggal</th>
                {isTeacher && <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isTeacher ? 9 : 5} className="py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-brand" size={32} />
                    <p className="text-muted-foreground mt-2 text-sm">Memuat data nilai...</p>
                  </td>
                </tr>
              ) : grades.length > 0 ? (
                grades.map(grade => {
                  const pct = Math.round((grade.score / (grade.maxScore || 100)) * 100);
                  const badge = getGradeBadge(grade.score, grade.maxScore || 100);
                  const isLocked = lockedGradeIds.has(grade.id) || grade.isLocked;
                  
                  return (
                    <tr key={grade.id} className={cn("border-b border-border/50 transition-colors", isLocked ? "bg-brand/10/20 hover:bg-brand/10/40" : "hover:bg-muted/20")}>
                      {isTeacher && (
                        <>
                          <td className="py-3 px-4 font-medium">{grade.student?.name || "-"}</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">{grade.student?.nis || "-"}</td>
                          <td className="py-3 px-4 text-xs">
                            <span className="px-2 py-0.5 bg-brand/10 text-brand rounded font-medium">
                              {grade.student?.class?.name || "-"}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} className="text-brand shrink-0" />
                          <span className="font-medium">{grade.subject?.name || "-"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn("text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded", getTypeBadgeColor(grade.type))}>
                          {grade.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn("font-bold text-base", getScoreColor(grade.score, grade.maxScore))}>{grade.score}</span>
                        <span className="text-muted-foreground text-xs">/{grade.maxScore || 100}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full border", badge.cls)}>
                          {pct}% · {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{formatDate(grade.date)}</td>
                      {isTeacher && (
                        <td className="py-3 px-4 text-center">
                          {isLocked ? (
                            <span className="inline-flex items-center gap-1 bg-brand/10 text-brand px-2 py-1 rounded-full text-xs font-semibold">
                              <Lock size={11} /> Terkunci
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEdit(grade)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand/10 transition-all"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteGrade(grade.id)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isTeacher ? 9 : 5} className="py-20 text-center">
                    <Award size={48} className="mx-auto text-muted-foreground/20 mb-3" />
                    <p className="font-semibold text-foreground">
                      {isTeacher ? "Belum ada nilai tercatat" : "Belum ada nilai tersedia"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isTeacher
                        ? "Klik 'Input Nilai Baru' untuk mulai menambahkan nilai siswa."
                        : "Nilai akan muncul di sini setelah guru menginput penilaian."}
                    </p>
                    {isTeacher && (
                      <Button className="mt-4" onClick={openAdd}>
                        <Plus size={16} /> Input Nilai Pertama
                      </Button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Nilai Akhir Summary */}
      {isTeacher && gradeSummary && (
        <Card className="mt-4 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground text-lg tracking-tight">
              Rekap Nilai Akhir Otomatis
            </h3>
            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full font-medium">
              Formula: {gradeSummary.formula}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Nama Siswa</th>
                  {gradeSummary.config?.components
                    .filter((c: any) => c.weight > 0)
                    .map((c: any) => (
                      <th key={c.name} className="text-center py-3 px-4 text-muted-foreground font-semibold">
                        {c.name}
                        <span className="block text-[10px] font-normal mt-0.5">({c.weight}%)</span>
                      </th>
                    ))}
                  <th className="text-center py-3 px-4 text-foreground font-bold">Nilai Akhir</th>
                </tr>
              </thead>
              <tbody>
                {gradeSummary.summary?.length > 0 ? gradeSummary.summary.map((s: any) => (
                  <tr key={s.studentId} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4 font-medium">{s.studentName}</td>
                    {gradeSummary.config?.components
                      .filter((c: any) => c.weight > 0)
                      .map((c: any) => (
                        <td key={c.name} className="py-3 px-4 text-center text-muted-foreground">
                          {s.scoreByType[c.name]?.toFixed(1) || "-"}
                        </td>
                      ))}
                    <td className="py-3 px-4 text-center">
                      <span className={cn("font-bold text-base", getScoreColor(s.finalScore, 100))}>
                        {s.finalScore}
                      </span>
                      <span className={cn(
                        "ml-2 text-xs font-bold px-2 py-1 rounded",
                        s.finalScore >= 80 ? 'bg-brand/10 text-brand' :
                        s.finalScore >= 60 ? 'bg-brand/10 text-brand' : 'bg-red-100 text-red-700'
                      )}>
                        {s.gradeLetter}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-muted-foreground">Belum ada siswa di kelas ini</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Input Nilai */}
      {isTeacher && (
        <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingGrade ? "Edit Nilai Siswa" : "Input Nilai Siswa"}>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <SearchableSelect
                label="Kelas"
                placeholder="Pilih kelas..."
                options={[
                  { value: "", label: "Pilih kelas..." },
                  ...classes.map(c => ({ value: String(c.id), label: c.name }))
                ]}
                value={filterClass}
                onChange={e => {
                  setFilterClass(e.target.value);
                  fetchStudentsForClass(e.target.value);
                }}
                disabled={!!editingGrade}
              />
              <SearchableSelect
                label="Mata Pelajaran"
                placeholder="Pilih mapel..."
                options={[
                  { value: "", label: "Pilih mapel..." },
                  ...subjects.map(s => ({ value: String(s.id), label: s.name }))
                ]}
                value={form.subjectId}
                onChange={e => setForm({ ...form, subjectId: e.target.value })}
                disabled={!!editingGrade}
              />
            </div>
            <SearchableSelect
              label="Nama Siswa"
              placeholder={students.length > 0 ? "Pilih siswa..." : "Pilih kelas dulu..."}
              options={[
                { value: "", label: students.length > 0 ? "Pilih siswa..." : "Pilih kelas dulu..." },
                ...students.map(s => ({ value: String(s.id), label: `${s.name} (${s.nis})` }))
              ]}
              value={form.studentId}
              onChange={e => setForm({ ...form, studentId: e.target.value })}
              disabled={!!editingGrade}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Tipe Penilaian"
                placeholder="Pilih tipe..."
                options={GRADE_TYPES}
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
              />
              <Input
                label="Tanggal"
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nilai"
                type="number"
                placeholder="0"
                min={0}
                value={form.score}
                onChange={e => setForm({ ...form, score: e.target.value })}
              />
              <Input
                label="Nilai Maksimal"
                type="number"
                placeholder="100"
                min={1}
                value={form.maxScore}
                onChange={e => setForm({ ...form, maxScore: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t mt-4">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Batal</Button>
              <Button
                onClick={handleSaveGradeWithConfirm}
                disabled={isSubmitting || !form.studentId || !form.subjectId || !form.type || !form.score}
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : "Simpan Nilai"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Konfirmasi Ganda */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 animate-in fade-in duration-200">
          <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-brand/10">
                <Lock size={20} className="text-brand" />
              </div>
              <h3 className="font-bold text-lg tracking-tight">Konfirmasi Kunci Nilai</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Apakah Anda yakin ingin mengunci nilai PSTS & PSAS Siswa ini?
            </p>
            <div className="p-3 bg-brand/10 border border-brand/20 rounded-lg mb-6">
              <p className="text-xs text-brand leading-relaxed">
                ⚠️ Nilai yang sudah dikunci akan langsung terkirim ke portal Wali Murid
                dan <strong>tidak dapat diubah kembali</strong> secara sembarangan oleh Guru.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setIsConfirmOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button className="flex-1 bg-brand hover:bg-brand text-white" onClick={handleConfirmSave} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <><CheckCircle2 size={16} className="mr-1.5"/> Ya, Kunci Nilai</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Setup Bobot */}
      {isTeacher && (
        <Modal
          isOpen={isWeightModalOpen}
          onClose={() => setIsWeightModalOpen(false)}
          title="Setup Bobot Penilaian"
          // size="lg" is not standard in this generic modal component, we handle inside
        >
          <div className="p-6 space-y-4 max-w-lg mx-auto w-[500px]">
            <div className="p-3 bg-brand/10 border border-brand/20 rounded-lg">
              <p className="text-sm text-brand">
                Total bobot semua komponen harus = 100%.
                Komponen dengan bobot 0 tidak dihitung dalam nilai akhir.
              </p>
            </div>

            <div className="p-3 bg-violet-50 border border-violet-100 rounded-lg">
              <p className="text-sm text-violet-700 font-medium">Formula saat ini:</p>
              <p className="text-sm text-violet-600 mt-1">
                {weightComponents
                  .filter((c: any) => Number(c.weight) > 0)
                  .map((c: any) => `${c.name} × ${c.weight}%`)
                  .join(" + ") || "Belum ada komponen aktif"}
              </p>
              <p className={cn(
                "text-sm font-bold mt-2",
                Math.round(weightComponents.reduce((s: number, c: any) => s + Number(c.weight), 0)) === 100
                  ? "text-brand" : "text-red-600"
              )}>
                Total: {weightComponents.reduce((s: number, c: any) => s + Number(c.weight), 0).toFixed(1)}%
                {Math.round(weightComponents.reduce((s: number, c: any) => s + Number(c.weight), 0)) === 100 ? " ✓" : " (harus 100%)"}
              </p>
            </div>

            <div className="space-y-3 mt-4">
              {weightComponents.map((comp: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {comp.name}
                      {!comp.isDefault && (
                        <span className="ml-2 text-[10px] text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full">
                          Custom
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={comp.weight}
                      onChange={e => {
                        const updated = [...weightComponents];
                        updated[i] = { ...updated[i], weight: Number(e.target.value) };
                        setWeightComponents(updated);
                      }}
                      className="w-24 accent-violet-600"
                    />
                    <div className="flex items-center border border-input rounded-md overflow-hidden bg-background">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={comp.weight}
                        onChange={e => {
                          const updated = [...weightComponents];
                          updated[i] = { ...updated[i], weight: Number(e.target.value) };
                          setWeightComponents(updated);
                        }}
                        className="w-14 text-center text-sm p-1.5 bg-transparent border-0 outline-none"
                      />
                      <span className="pr-2 text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
              <Button variant="secondary" onClick={() => setIsWeightModalOpen(false)}>Batal</Button>
              <Button
                onClick={handleSaveWeightConfig}
                disabled={Math.round(weightComponents.reduce((s: number, c: any) => s + Number(c.weight), 0)) !== 100}
              >
                Simpan Konfigurasi
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
