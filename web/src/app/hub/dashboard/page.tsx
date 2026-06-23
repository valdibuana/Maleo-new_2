"use client";

import { ForceChangePasswordModal } from "@/components/modals/ForceChangePasswordModal"
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { BookOpen, ClipboardCheck, Clock, Award, Loader2, RefreshCcw } from "lucide-react";
import { apiService } from "@/services/apiService";
import api from "@/lib/axios";
import { formatDate } from "@/lib/utils";

export default function HubDashboard() {
  const [showModal, setShowModal] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [annLoading, setAnnLoading] = useState(true);

  useEffect(() => {
    // Only show force-change-password modal when the user flag is set
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (storedUser.force_change_password) {
        setShowModal(true);
      }
    } catch {}
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiService.getAll("/hub/dashboard");
      setData(response.data);
    } catch (err: any) {
      setError("Gagal memuat data dashboard. Silakan coba lagi nanti.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    setAnnLoading(true);
    try {
      const response = await apiService.getAll("/hub/announcements");
      setAnnouncements(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setAnnLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchAnnouncements();
  }, []);

  const handlePasswordChange = async (oldPass: string, newPass: string) => {
    await api.put("/auth/change-password", { currentPassword: oldPass, newPassword: newPass });
  };

  // Early returns must come AFTER all hook calls
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="animate-pulse">Menyiapkan dashboard Anda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center space-y-4">
        <div className="inline-flex p-4 rounded-full bg-red-50 text-red-600 mb-2">
          <RefreshCcw size={32} />
        </div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">{error}</h2>
        <button onClick={fetchDashboard} className="px-6 py-2 bg-brand text-white rounded-lg hover:bg-brand transition-colors">
          Coba Lagi
        </button>
      </div>
    );
  }

  const { stats, todaySchedules } = data || { stats: {}, todaySchedules: [] };
  const userRole = data?.stats ? (data.stats.subjects === 0 ? "student" : "teacher") : "loading";
  const isTeacher = userRole === "teacher";

  return (
    <div className="space-y-6">
      <ForceChangePasswordModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false);
          // Clear the flag in localStorage so it doesn't show again
          try {
            const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
            storedUser.force_change_password = false;
            localStorage.setItem("user", JSON.stringify(storedUser));
          } catch {}
        }}
        onSubmit={handlePasswordChange}
      />
      <PageHeader
        title="Dashboard"
        subtitle="Selamat datang di Maleo Hub — Portal Pembelajaran Anda"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 border-l-4 border-l-teal-500 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-brand/10 text-brand">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Jadwal Hari Ini</p>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">{todaySchedules.length} Mapel</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-emerald-500 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-brand/10 text-brand">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tugas Aktif</p>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">{stats.activeAssignments || 0} Tugas</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-cyan-500 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-cyan-100 text-cyan-600">
              <ClipboardCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Kehadiran {isTeacher ? "Siswa" : "Anda"}</p>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">{stats.attendanceRate || 0}%</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-blue-500 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-brand/10 text-brand">
              <Award size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rata-rata Nilai</p>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">{(stats.averageGrade || 0).toFixed(1)}</h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold tracking-tight">{isTeacher ? "Jadwal Mengajar Hari Ini" : "Jadwal Belajar Hari Ini"}</h3>
            <span className="text-xs font-medium px-2 py-1 bg-muted rounded-md uppercase tracking-wider">
              {new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
            </span>
          </div>
          <div className="space-y-4">
            {todaySchedules.length > 0 ? (
              todaySchedules.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-brand/20 hover:bg-brand/10/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-12 rounded-full bg-brand/100 group-hover:scale-y-110 transition-transform"></div>
                    <div>
                      <h4 className="font-bold text-foreground">{s.subject}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock size={14} /> {s.time}
                        </p>
                        <span className="text-xs px-2 py-0.5 rounded bg-brand/10 text-brand font-semibold">
                          {isTeacher ? s.class : s.teacher}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-background border shadow-sm text-sm font-bold group-hover:text-brand transition-colors">
                    {s.room}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                <p>Tidak ada jadwal {isTeacher ? "mengajar" : "belajar"} hari ini.</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4 tracking-tight">Pengumuman Terbaru</h3>
          <div className="space-y-4">
            {annLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-muted-foreground" size={24} />
              </div>
            ) : announcements.length > 0 ? (
              announcements.map((ann) => (
                <div key={ann.id} className={`p-4 rounded-xl border relative overflow-hidden group ${ann.priority === 'urgent' ? 'bg-rose-50 border-rose-100' : ann.priority === 'important' ? 'bg-brand/10 border-brand/20' : 'bg-muted/50 border-border'}`}>
                  <h4 className={`font-bold ${ann.priority === 'urgent' ? 'text-rose-900' : ann.priority === 'important' ? 'text-brand' : 'text-foreground'}`}>{ann.title}</h4>
                  <p className={`text-sm mt-1 line-clamp-2 ${ann.priority === 'urgent' ? 'text-rose-700' : ann.priority === 'important' ? 'text-brand' : 'text-muted-foreground'}`}>{ann.content}</p>
                  <p className={`text-[10px] mt-3 font-medium ${ann.priority === 'urgent' ? 'text-rose-500' : ann.priority === 'important' ? 'text-brand' : 'text-muted-foreground'}`}>{formatDate(ann.createdAt)}</p>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                <p className="text-sm italic">Belum ada pengumuman terbaru</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
