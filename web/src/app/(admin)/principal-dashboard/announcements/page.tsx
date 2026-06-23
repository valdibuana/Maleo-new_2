"use client";

import React, { useState, useEffect } from "react";
import { Search, Megaphone, Loader2, RefreshCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { apiService } from "@/services/apiService";
import { formatDate } from "@/lib/utils";

const priorityConfig: Record<string, { variant: "success" | "warning" | "danger" | "neutral"; label: string }> = {
  normal: { variant: "neutral", label: "Normal" },
  important: { variant: "warning", label: "Penting" },
  urgent: { variant: "danger", label: "Urgent" },
};
const targetConfig: Record<string, string> = {
  all: "Semua",
  teacher: "Guru",
  student: "Siswa",
  guardian: "Wali Murid",
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAll("/announcements");
      setAnnouncements(response.data);
    } catch (err: any) {
      setError("Gagal mengambil data pengumuman");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const filtered = announcements.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 animate-in fade-in slide-in-from-top-1">{error}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Pengumuman</h1>
          <p className="text-sm text-muted-foreground mt-1">Pantau pengumuman sekolah</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchAnnouncements}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      <div className="max-w-md">
        <Input placeholder="Cari pengumuman..." icon={<Search size={16} />} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>Memuat pengumuman...</p>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((announcement) => {
            const priority = priorityConfig[announcement.priority] || priorityConfig.normal;
            return (
              <Card key={announcement.id} className="group hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${announcement.isPublished ? "bg-brand/10" : "bg-slate-100"}`}>
                    <Megaphone size={20} className={announcement.isPublished ? "text-brand" : "text-slate-400"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-semibold text-foreground tracking-tight font-bold">{announcement.title}</h3>
                      <Badge variant={priority.variant}>{priority.label}</Badge>
                      <Badge variant={announcement.isPublished ? "success" : "neutral"}>
                        {announcement.isPublished ? "Terbit" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{announcement.content}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Target: <strong>{targetConfig[announcement.target] || "Semua"}</strong></span>
                      <span>Oleh: {announcement.author}</span>
                      <span>{formatDate(announcement.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="py-20 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
            {search ? "Pengumuman tidak ditemukan." : "Belum ada pengumuman."}
          </div>
        )}
      </div>
    </div>
  );
}
