"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { apiService } from "@/services/apiService";
import { Loader2, AlertCircle, BookOpen } from "lucide-react";

export default function StudentAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const stored = localStorage.getItem("user");
        if (!stored) {
          setError("Data pengguna tidak ditemukan. Silakan login kembali.");
          setLoading(false);
          return;
        }

        const user = JSON.parse(stored);

        // --- Resolusi studentId yang tahan banting ---
        // Login hanya menyimpan {id, name, role, nipNis} ke localStorage.
        // Field "studentId" TIDAK pernah ada di sana.
        // Solusi: fetch /api/profile yang me-return relasi "student" object.
        let studentId: number | null = user.studentId ?? null;

        if (!studentId && user.role === "student") {
          try {
            const profileRes = await apiService.getAll("/profile");
            // Endpoint GET /api/profile me-select `student: true` (relasi),
            // sehingga response = { data: { ..., student: { id, nis, name, ... } } }
            const profileStudent = profileRes.data?.student;
            if (profileStudent && profileStudent.id) {
              studentId = profileStudent.id;
              // Cache untuk sesi berikutnya agar tidak fetch ulang
              user.studentId = studentId;
              localStorage.setItem("user", JSON.stringify(user));
            }
          } catch (profileErr) {
            console.error("Gagal mengambil profil siswa:", profileErr);
          }
        }

        if (!studentId) {
          setError("Profil siswa tidak lengkap. Hubungi admin untuk menghubungkan akun Anda.");
          setLoading(false);
          return;
        }

        const res = await apiService.getAll(`/classification/student/${studentId}`);
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Gagal memuat data klasifikasi minat.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-3">
        <AlertCircle size={20} />
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-12 text-center">
        <BookOpen size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground text-sm italic">
          Belum ada data nilai yang cukup untuk melakukan analisis semester ini.
        </p>
      </Card>
    );
  }

  const { analysisData } = data;

  const getWidth = (avg: number) => {
    return Math.max(5, Math.min(100, avg));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Capaian Rumpun Ilmu</h1>
        <p className="text-muted-foreground">
          Visualisasi rata-rata nilai kompetensi per kluster mata pelajaran.
        </p>
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-6 tracking-tight">Breakdown Capaian per Kluster</h3>
        
        <div className="space-y-6">
          {/* Sains Progress */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="font-medium text-slate-700">Sains & Teknologi</p>
                <p className="text-xs text-muted-foreground">{analysisData.sains.count} Mapel</p>
              </div>
              <span className="font-bold text-brand">{analysisData.sains.avg}</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand/100 rounded-full transition-all duration-1000"
                style={{ width: `${getWidth(analysisData.sains.avg)}%` }}
              />
            </div>
          </div>

          {/* Sosial Progress */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="font-medium text-slate-700">Sosial & Humaniora</p>
                <p className="text-xs text-muted-foreground">{analysisData.sosial.count} Mapel</p>
              </div>
              <span className="font-bold text-brand">{analysisData.sosial.avg}</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand/100 rounded-full transition-all duration-1000"
                style={{ width: `${getWidth(analysisData.sosial.avg)}%` }}
              />
            </div>
          </div>

          {/* Vokasi Progress */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="font-medium text-slate-700">Vokasi & Keterampilan</p>
                <p className="text-xs text-muted-foreground">{analysisData.vokasi.count} Mapel</p>
              </div>
              <span className="font-bold text-brand">{analysisData.vokasi.avg}</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand/100 rounded-full transition-all duration-1000"
                style={{ width: `${getWidth(analysisData.vokasi.avg)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
