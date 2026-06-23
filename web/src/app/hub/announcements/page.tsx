"use client";

import React, { useState, useEffect } from "react";
import { Megaphone, Calendar, User, Loader2, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { apiService } from "@/services/apiService";
import { formatDate } from "@/lib/utils";

export default function HubAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await apiService.getAll("/hub/announcements");
        setAnnouncements(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Pengumuman</h1>
        <p className="text-sm text-muted-foreground mt-1">Informasi dan berita terbaru dari sekolah</p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="animate-spin mb-2" />
          <p>Memuat pengumuman...</p>
        </div>
      ) : announcements.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {announcements.map((ann) => (
            <Card key={ann.id} className={`p-0 overflow-hidden border-l-4 shadow-sm ${
              ann.priority === 'urgent' ? 'border-l-rose-500' : 
              ann.priority === 'important' ? 'border-l-amber-500' : 'border-l-indigo-500'
            }`}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      ann.priority === 'urgent' ? 'bg-rose-50 text-rose-600' : 
                      ann.priority === 'important' ? 'bg-brand/10 text-brand' : 'bg-brand/10 text-brand'
                    }`}>
                      <Megaphone size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground tracking-tight">{ann.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(ann.createdAt)}</span>
                        <span className="flex items-center gap-1"><User size={12} /> {ann.author}</span>
                      </div>
                    </div>
                  </div>
                  {ann.priority !== 'normal' && (
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                      ann.priority === 'urgent' ? 'bg-rose-100 text-rose-700' : 'bg-brand/10 text-brand'
                    }`}>
                      {ann.priority}
                    </span>
                  )}
                </div>
                
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                  {ann.content}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl bg-card">
          <div className="inline-flex p-4 rounded-full bg-muted mb-4">
            <Megaphone size={32} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground tracking-tight">Belum Ada Pengumuman</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
            Informasi penting dari sekolah akan ditampilkan di halaman ini.
          </p>
        </div>
      )}

      <div className="p-4 rounded-xl bg-brand/10 border border-brand/20 flex items-start gap-3 text-brand text-sm">
        <Info size={18} className="shrink-0 mt-0.5" />
        <p>Halaman ini menampilkan pengumuman yang relevan dengan peran Anda sebagai Guru atau Siswa di Maleo Hub.</p>
      </div>
    </div>
  );
}
