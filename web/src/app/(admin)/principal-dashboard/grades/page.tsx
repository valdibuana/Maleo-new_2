"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  RefreshCcw, Search, TrendingUp,
  Award, BookOpen, X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { apiService } from "@/services/apiService";

export default function ScoresPage() {
  // ── Data state ────────────────────────────────────────────────────────────
  const [grades, setGrades] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterType, setFilterType] = useState("");

  // ── Fetch master data (sekali) ────────────────────────────────────────────
  const fetchMasterData = async () => {
    try {
      const [classesRes, subjectsRes, studentsRes] = await Promise.all([
        apiService.getAll("/classes"),
        apiService.getAll("/subjects"),
        apiService.getAll("/students"),
      ]);
      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (err) {
      console.error("Gagal fetch master data", err);
    }
  };

  // ── Fetch grades (reactive terhadap filter) ───────────────────────────────
  const fetchGrades = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: any = {};
      if (filterClass) params.className = filterClass;
      if (filterSubject) params.subject = filterSubject;
      if (filterType) params.type = filterType;
      if (search) params.search = search;

      const res = await apiService.getAll("/grades", params);
      setGrades(res.data || []);
    } catch {
      setError("Gagal memuat data nilai.");
      setGrades([]);
    } finally {
      setLoading(false);
    }
  }, [filterClass, filterSubject, filterType, search]);

  useEffect(() => { fetchMasterData(); }, []);

  useEffect(() => {
    const timer = setTimeout(fetchGrades, 300);
    return () => clearTimeout(timer);
  }, [fetchGrades]);



  // ── Helpers ───────────────────────────────────────────────────────────────
  const stats = {
    total: grades.length,
    avg: grades.length > 0
      ? (grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / grades.length).toFixed(1)
      : "0",
    highest: grades.length > 0
      ? Math.max(...grades.map(g => (g.score / g.maxScore) * 100)).toFixed(1)
      : "0",
    belowPass: grades.filter(g => (g.score / g.maxScore) * 100 < 60).length,
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const pct = (score / maxScore) * 100;
    if (pct >= 80) return "text-brand";
    if (pct >= 60) return "text-brand";
    return "text-red-600";
  };

  const getTypeBadgeColor = (type: string) => {
    const map: Record<string, string> = {
      Tugas: "bg-brand/10 text-brand",
      PSTS:  "bg-brand/10 text-brand",
      PSAS:  "bg-rose-100 text-rose-700",
      Kuis:  "bg-brand/10 text-brand",
    };
    return map[type] || "bg-slate-100 text-slate-800";
  };

  const statCards = [
    { label: "Total Record",    value: stats.total,          icon: BookOpen,   colorClass: "bg-brand/10 text-brand" },
    { label: "Rata-rata",       value: `${stats.avg}%`,      icon: TrendingUp, colorClass: "bg-brand/10 text-brand" },
    { label: "Nilai Tertinggi", value: `${stats.highest}%`,  icon: Award,      colorClass: "bg-brand/10 text-brand" },
    { label: "Di Bawah KKM",   value: stats.belowPass,      icon: Award,      colorClass: "bg-rose-100 text-rose-600" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Notifikasi */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")}><X size={16} /></button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-brand/10 border border-brand/20 text-brand rounded-lg">
          {success}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Data Nilai Siswa</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola dan pantau nilai akademik seluruh siswa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchGrades} disabled={loading}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {s.label}
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${s.colorClass}`}>
                <s.icon size={20} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter + Tabel */}
      <Card className="p-6">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 h-10 rounded-lg border border-input bg-card text-sm
                text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>
          <div className="w-36">
            <SearchableSelect
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              placeholder="Semua Kelas"
              options={[{ value: "", label: "Semua Kelas" }, ...classes.map(c => ({ value: c.name, label: c.name }))]}
            />
          </div>
          <div className="w-40">
            <SearchableSelect
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              placeholder="Semua Mapel"
              options={[{ value: "", label: "Semua Mapel" }, ...subjects.map(s => ({ value: s.name, label: s.name }))]}
            />
          </div>
          <div className="w-36">
            <SearchableSelect
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              placeholder="Semua Tipe"
              options={[
                { value: "", label: "Semua Tipe" },
                { value: "Tugas", label: "Tugas" },
                { value: "PSTS",  label: "PSTS"  },
                { value: "PSAS",  label: "PSAS"  },
                { value: "Kuis",  label: "Kuis"  },
              ]}
            />
          </div>
          {(filterClass || filterSubject || filterType || search) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setFilterClass("");
                setFilterSubject("");
                setFilterType("");
                setSearch("");
              }}
            >
              Reset
            </Button>
          )}
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Memuat data nilai...</p>
            </div>
          ) : grades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Award size={40} className="opacity-30 mb-3" />
              <p className="font-medium">Belum ada data nilai</p>
              <p className="text-sm mt-1">Belum ada data nilai yang terinput</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["No", "Siswa", "Kelas", "Mapel", "Tipe", "Nilai", "Tanggal"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-semibold text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grades.map((grade, i) => (
                  <tr
                    key={grade.id}
                    className="border-b border-border/50 hover:bg-accent/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-muted-foreground">{i + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={grade.studentName} size="sm" />
                        <span className="font-medium text-foreground">{grade.studentName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="info">{grade.className}</Badge>
                    </td>
                    <td className="py-3 px-4 text-foreground">{grade.subjectName}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor(grade.type)}`}>
                        {grade.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-base font-bold ${getScoreColor(grade.score, grade.maxScore)}`}>
                        {grade.score}
                      </span>
                      <span className="text-xs text-muted-foreground">/{grade.maxScore}</span>
                      <span className={`ml-2 text-xs font-medium ${getScoreColor(grade.score, grade.maxScore)}`}>
                        ({((grade.score / grade.maxScore) * 100).toFixed(0)}%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(grade.date).toLocaleDateString("id-ID", {
                        day: "numeric", month: "short",
                      })}
                    </td>
                      </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!loading && grades.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{grades.length} record ditemukan</p>
            <p className="text-sm font-medium">
              Rata-rata:{" "}
              <span className="text-brand font-bold">{stats.avg}%</span>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
