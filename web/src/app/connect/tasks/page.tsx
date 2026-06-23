"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiService } from "@/services/apiService";
import {
  ClipboardList,
  BookOpen,
  Clock,
  User2,
  Loader2,
  UserX,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

function getDaysLeft(dueDate: string) {
  const diff = new Date(dueDate).getTime() - new Date().getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}

export default function TasksPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "overdue">("all");

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await apiService.getAll("/connect/children");
        const list = res.data || [];
        setChildren(list);
        if (list.length > 0) setSelectedChild(list[0]);
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
    const fetchTasks = async () => {
      setLoadingTasks(true);
      try {
        const res = await apiService.getAll(
          `/connect/child/${selectedChild.id}/assignments`
        );
        setTasks(res.data || []);
      } catch (error) {
        console.error("Gagal mengambil tugas", error);
      } finally {
        setLoadingTasks(false);
      }
    };
    fetchTasks();
  }, [selectedChild]);

  const filteredTasks = tasks.filter((task: any) => {
    const daysLeft = getDaysLeft(task.dueDate);
    if (filter === "upcoming") return daysLeft >= 0;
    if (filter === "overdue") return daysLeft < 0;
    return true;
  });

  const upcomingCount = tasks.filter((t) => getDaysLeft(t.dueDate) >= 0).length;
  const overdueCount = tasks.filter((t) => getDaysLeft(t.dueDate) < 0).length;

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
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Tugas Siswa</h1>
        <p className="text-muted-foreground">
          Pantau daftar tugas dan tenggat waktu anak Anda.
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
          {/* Top Bar: pilih anak + filter */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {children.length > 1 && (
                <div className="flex gap-2">
                  {children.map((child: any) => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedChild(child)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        selectedChild?.id === child.id
                          ? "bg-brand/100 text-white border-brand shadow-md"
                          : "bg-background text-foreground border-border hover:border-brand"
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                        {child.name?.charAt(0)}
                      </div>
                      {child.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Filter Tabs */}
              <div className="flex gap-2 ml-auto">
                {(["all", "upcoming", "overdue"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      filter === f
                        ? "bg-brand/100 text-white border-brand"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {f === "all" && `Semua (${tasks.length})`}
                    {f === "upcoming" && `Aktif (${upcomingCount})`}
                    {f === "overdue" && `Terlambat (${overdueCount})`}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {loadingTasks ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-brand" size={28} />
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card className="p-12 text-center">
              <ClipboardList
                size={40}
                className="mx-auto mb-3 text-muted-foreground opacity-30"
              />
              <p className="text-muted-foreground text-sm italic">
                {filter === "overdue"
                  ? "Tidak ada tugas yang terlambat. 🎉"
                  : "Tidak ada tugas untuk ditampilkan."}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((task: any) => {
                const daysLeft = getDaysLeft(task.dueDate);
                const isOverdue = daysLeft < 0;
                const isUrgent = daysLeft >= 0 && daysLeft <= 3;

                return (
                  <Card
                    key={task.id}
                    className={`p-5 border-l-4 transition-shadow hover:shadow-md ${
                      isOverdue
                        ? "border-l-red-500"
                        : isUrgent
                        ? "border-l-amber-500"
                        : "border-l-green-500"
                    }`}
                  >
                    {/* Judul & Status */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-bold text-foreground leading-tight line-clamp-2 tracking-tight">
                        {task.title}
                      </h3>
                      {isOverdue ? (
                        <Badge variant="danger" className="shrink-0">
                          <AlertCircle size={11} className="mr-1" />
                          Terlambat
                        </Badge>
                      ) : isUrgent ? (
                        <Badge variant="warning" className="shrink-0">
                          <Clock size={11} className="mr-1" />
                          {daysLeft === 0 ? "Hari ini" : `${daysLeft}h lagi`}
                        </Badge>
                      ) : (
                        <Badge variant="success" className="shrink-0">
                          <CheckCircle2 size={11} className="mr-1" />
                          {daysLeft}h lagi
                        </Badge>
                      )}
                    </div>

                    {/* Deskripsi */}
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <BookOpen size={13} className="text-brand" />
                        {task.subject?.name}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <User2 size={13} className="text-brand" />
                        {task.teacher?.name}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-rose-500" />
                        Tenggat:{" "}
                        {new Date(task.dueDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
