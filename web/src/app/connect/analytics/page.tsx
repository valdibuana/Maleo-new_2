"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { apiService } from "@/services/apiService";
import { Loader2, AlertCircle, BookOpen, UserX } from "lucide-react";

export default function GuardianAnalyticsPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await apiService.getAll("/connect/children");
        const list = res.data || [];
        setChildren(list);
        if (list.length > 0) {
          setSelectedChild(list[0]);
        }
      } catch (err: any) {
        console.error("Gagal mengambil data anak", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      setError("");
      setData(null);
      try {
        const res = await apiService.getAll(`/classification/student/${selectedChild.id}`);
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Gagal memuat data klasifikasi minat.");
      } finally {
        setLoadingAnalytics(false);
      }
    };
    fetchAnalytics();
  }, [selectedChild]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  const renderAnalytics = () => {
    if (loadingAnalytics) {
      return (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand" size={28} />
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
            Belum ada data nilai yang cukup untuk melakukan analisis pada siswa ini di semester berjalan.
          </p>
        </Card>
      );
    }

    const { analysisData } = data;

    const getWidth = (avg: number) => {
      return Math.max(5, Math.min(100, avg));
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {/* Progress Breakdown */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-6 tracking-tight">Breakdown Capaian per Kluster</h3>
          
          <div className="space-y-6">
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
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Analisis Minat Belajar</h1>
        <p className="text-muted-foreground">
          Lihat rata-rata nilai dan kecenderungan minat belajar anak per kelompok mata pelajaran.
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
              </div>
            </Card>
          )}

          {renderAnalytics()}
        </>
      )}
    </div>
  );
}
