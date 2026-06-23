"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiService } from "@/services/apiService";
import { Megaphone, Loader2, Info, AlertTriangle, Siren } from "lucide-react";

const PRIORITY_CONFIG: Record<string, { label: string; icon: React.ReactNode; badgeVariant: any; borderColor: string; bgColor: string }> = {
  normal: {
    label: "Informasi",
    icon: <Info size={16} />,
    badgeVariant: "neutral",
    borderColor: "border-l-blue-400",
    bgColor: "bg-brand/10",
  },
  important: {
    label: "Penting",
    icon: <AlertTriangle size={16} />,
    badgeVariant: "warning",
    borderColor: "border-l-amber-400",
    bgColor: "bg-brand/10",
  },
  urgent: {
    label: "Mendesak",
    icon: <Siren size={16} />,
    badgeVariant: "danger",
    borderColor: "border-l-red-500",
    bgColor: "bg-red-50",
  },
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        // Ambil dari dashboard (sudah include announcements)
        const res = await apiService.getAll("/connect/dashboard");
        setAnnouncements(res.data?.announcements || []);
      } catch (error) {
        console.error("Gagal mengambil pengumuman", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

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
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Pengumuman</h1>
          <p className="text-muted-foreground">
            Informasi dan pemberitahuan dari sekolah untuk wali murid.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand/10 border border-brand/20">
          <Megaphone size={16} className="text-brand" />
          <span className="text-sm font-semibold text-brand">
            {announcements.length} Pengumuman
          </span>
        </div>
      </div>

      {announcements.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center gap-4">
          <div className="p-5 rounded-full bg-brand/10 text-brand-light">
            <Megaphone size={40} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1 tracking-tight font-bold">
              Belum ada pengumuman
            </h3>
            <p className="text-sm text-muted-foreground">
              Pengumuman terbaru dari sekolah akan muncul di sini.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann: any) => {
            const priority = ann.priority ?? "normal";
            const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.normal;
            const isOpen = expanded === ann.id;

            return (
              <Card
                key={ann.id}
                className={`border-l-4 overflow-hidden ${cfg.borderColor}`}
              >
                <button
                  className="w-full text-left"
                  onClick={() => setExpanded(isOpen ? null : ann.id)}
                >
                  <div className="flex items-start gap-4 p-5">
                    {/* Icon Priority */}
                    <div className={`p-2 rounded-lg ${cfg.bgColor} shrink-0 mt-0.5`}>
                      <span
                        className={
                          priority === "urgent"
                            ? "text-red-600"
                            : priority === "important"
                            ? "text-brand"
                            : "text-brand"
                        }
                      >
                        {cfg.icon}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-foreground text-base leading-tight tracking-tight">
                          {ann.title}
                        </h3>
                        <Badge variant={cfg.badgeVariant}>{cfg.label}</Badge>
                      </div>
                      <p
                        className={`text-sm text-muted-foreground ${
                          isOpen ? "" : "line-clamp-2"
                        }`}
                      >
                        {ann.content}
                      </p>
                    </div>

                    {/* Meta */}
                    <div className="text-right shrink-0 text-xs text-muted-foreground space-y-1">
                      <p className="font-medium">{ann.author}</p>
                      <p>
                        {new Date(ann.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-brand font-medium">
                        {isOpen ? "Tutup ▲" : "Baca ▼"}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Konten lengkap saat expanded */}
                {isOpen && (
                  <div className={`px-5 pb-5 ${cfg.bgColor} border-t border-border/30`}>
                    <div className="pt-4">
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {ann.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-4">
                        Ditulis oleh <span className="font-semibold">{ann.author}</span> pada{" "}
                        {new Date(ann.createdAt).toLocaleDateString("id-ID", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
