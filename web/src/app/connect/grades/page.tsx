"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiService } from "@/services/apiService";
import { Award, BookOpen, Loader2, TrendingUp, UserX } from "lucide-react";

const SCORE_TYPE_COLOR: Record<string, string> = {
  Tugas: "bg-brand/10 text-brand border-brand/20",
  PSTS: "bg-brand/10 text-brand border-brand/20",
  PSAS: "bg-red-100 text-red-700 border-red-200",
  Kuis: "bg-brand/10 text-brand border-brand/20",
};

function getGradeColor(avg: number) {
  if (avg >= 85) return "text-green-600";
  if (avg >= 70) return "text-brand";
  return "text-red-500";
}

export default function ScoresPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [gradeData, setGradeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await apiService.getAll("/connect/children");
        const list = res.data || [];
        setChildren(list);
        if (list.length > 0) {
          setSelectedChild(list[0]);
        }
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
    const fetchGrades = async () => {
      setLoadingGrades(true);
      try {
        const res = await apiService.getAll(
          `/connect/child/${selectedChild.id}/grades`
        );
        setGradeData(res.data || []);
      } catch (error) {
        console.error("Gagal mengambil nilai", error);
      } finally {
        setLoadingGrades(false);
      }
    };
    fetchGrades();
  }, [selectedChild]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Nilai Siswa</h1>
        <p className="text-muted-foreground">
          Pantau perkembangan nilai akademik anak Anda.
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
          {/* Pilih Anak */}
          {children.length > 1 && (
            <div className="flex gap-3 flex-wrap">
              {children.map((child: any) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    selectedChild?.id === child.id
                      ? "bg-brand/100 text-white border-brand shadow-md"
                      : "bg-card text-foreground border-border hover:border-brand"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    {child.name?.charAt(0)}
                  </div>
                  {child.name}
                </button>
              ))}
            </div>
          )}

          {/* Info Anak Terpilih */}
          {selectedChild && (
            <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-brand/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-light to-brand flex items-center justify-center text-white font-bold text-lg">
                  {selectedChild.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-foreground">{selectedChild.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedChild.nis} • {selectedChild.class?.name}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <TrendingUp size={16} className="text-brand" />
                  <span className="text-sm font-semibold text-brand">
                    {gradeData.length} Mata Pelajaran
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Tabel Nilai */}
          {loadingGrades ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-brand" size={28} />
            </div>
          ) : gradeData.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-sm italic">
                Belum ada data nilai untuk siswa ini.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {gradeData.map((subject: any, idx: number) => (
                <Card key={idx} className="overflow-hidden border-border">
                  {/* Header Mapel */}
                  <div className="flex items-center justify-between px-6 py-4 bg-muted/40 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-brand/10 text-brand">
                        <BookOpen size={18} />
                      </div>
                      <h3 className="font-bold text-foreground tracking-tight">{subject.subject}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award size={16} className={getGradeColor(subject.avg)} />
                      <span
                        className={`text-xl font-bold ${getGradeColor(subject.avg)}`}
                      >
                        {subject.avg}
                      </span>
                      <span className="text-xs text-muted-foreground">rata-rata</span>
                    </div>
                  </div>

                  {/* Daftar Nilai */}
                  <div className="divide-y divide-border">
                    {subject.grades.map((grade: any) => (
                      <div
                        key={grade.id}
                        className="flex items-center justify-between px-6 py-3 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                              SCORE_TYPE_COLOR[grade.type] ??
                              "bg-slate-100 text-slate-800 border-slate-200"
                            }`}
                          >
                            {grade.type}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(grade.date).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-lg font-bold ${getGradeColor(
                              (grade.score / grade.maxScore) * 100
                            )}`}
                          >
                            {grade.score}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            / {grade.maxScore}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
