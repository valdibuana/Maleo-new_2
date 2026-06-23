"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Users, Award, ClipboardCheck, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { apiService } from "@/services/apiService";

export default function ConnectDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiService.getAll("/connect/dashboard");
        setSummary(res.data);
      } catch (error) {
        console.error("Gagal fetch dashboard wali murid", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard Wali Murid</h1>
        <p className="text-muted-foreground">
          Selamat datang, {summary?.guardian?.name}! Pantau Perkembangan Akademik Anak Anda
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-brand/10 text-brand">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Anak</p>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">{summary?.totalChildren ?? 0} Anak</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-orange-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-brand/10 text-brand">
              <ClipboardCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status Aktif</p>
              <h3 className="text-xl font-bold text-foreground tracking-tight">Terhubung</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-rose-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-100 text-rose-600">
              <Award size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Semester</p>
              <h3 className="text-xl font-bold text-foreground tracking-tight">{summary?.academicYear ?? "-"}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-yellow-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-100 text-yellow-600">
              <Megaphone size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pengumuman</p>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">{summary?.unreadAnnouncements ?? 0}</h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 col-span-2">
          <h3 className="text-lg font-bold mb-4 tracking-tight">Anak Anda</h3>
          <div className="space-y-4">
            {summary?.children && summary.children.length > 0 ? (
              summary.children.map((child: any) => (
                <div key={child.id} className="p-4 border rounded-xl bg-card border-border">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-light to-brand flex items-center justify-center text-white font-bold text-lg">
                        {child.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-lg text-foreground">{child.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {child.nis} • {child.class?.name}
                        </p>
                      </div>
                    </div>
                    <Badge variant={child.attendanceRate >= 75 ? "success" : "danger"}>
                      {child.attendanceRate}% Hadir
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center p-3 bg-muted rounded-lg border border-border">
                      <p className="text-2xl font-bold text-foreground">{child.avgGrade}</p>
                      <p className="text-xs font-medium text-muted-foreground mt-1">Rata-rata Nilai</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg border border-border">
                      <p className="text-2xl font-bold text-foreground">{child.activeAssignments}</p>
                      <p className="text-xs font-medium text-muted-foreground mt-1">Tugas Aktif</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic text-center p-8 bg-muted rounded-xl">Belum ada data anak yang terhubung ke akun Anda.</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4 tracking-tight">Informasi Sekolah</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-brand/10 border border-brand/20">
              <h4 className="font-semibold text-brand">Selamat Datang di Portal Wali Murid</h4>
              <p className="text-sm text-brand mt-1">Gunakan portal ini untuk memantau kehadiran, nilai, dan informasi akademik anak Anda.</p>
            </div>
            {summary?.announcements?.map((ann: any) => (
              <div key={ann.id} className="p-4 rounded-xl bg-muted border border-border">
                <h4 className="font-semibold text-sm">{ann.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ann.content}</p>
                <p className="text-[10px] text-muted-foreground mt-2">{new Date(ann.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
