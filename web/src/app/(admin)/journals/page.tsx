"use client";
import React, { useState, useEffect } from "react";
import { apiService } from "@/services/apiService";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  BookOpen, Loader2, Search, Calendar, User, BookMarked,
  ChevronLeft, ChevronRight, Eye, X
} from "lucide-react";

const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember"
];

function JournalDetailModal({ journal, onClose }: { journal: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-semibold">Detail Jurnal Mengajar</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Guru</span>
              <p className="font-medium mt-0.5">{journal.teacher?.name || "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tanggal</span>
              <p className="font-medium mt-0.5">{new Date(journal.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Kelas</span>
              <p className="font-medium mt-0.5">{journal.class?.name || "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Mata Pelajaran</span>
              <p className="font-medium mt-0.5">{journal.subject?.name || "-"}</p>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Materi yang Diajarkan</p>
            <p className="text-sm font-medium">{journal.material}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tujuan Pembelajaran</p>
            <p className="text-sm">{journal.objective}</p>
          </div>
          {journal.activityNotes && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Catatan Kegiatan</p>
              <p className="text-sm">{journal.activityNotes}</p>
            </div>
          )}
          {journal.constraints && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Kendala</p>
              <p className="text-sm">{journal.constraints}</p>
            </div>
          )}
          {journal.followUp && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tindak Lanjut</p>
              <p className="text-sm">{journal.followUp}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminJournalsPage() {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJournal, setSelectedJournal] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({});

  const fetchJournals = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${lastDay}`;

      const res = await apiService.getAll("/teacher-journals", {
        startDate,
        endDate,
        page,
        limit: 15,
      });
      setJournals(res.data || []);
      setMeta(res.meta || {});
    } catch (error) {
      console.error("Gagal memuat jurnal:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournals();
  }, [selectedMonth, selectedYear, page]);

  const filtered = journals.filter((j) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      j.teacher?.name?.toLowerCase().includes(s) ||
      j.subject?.name?.toLowerCase().includes(s) ||
      j.class?.name?.toLowerCase().includes(s) ||
      j.material?.toLowerCase().includes(s)
    );
  });

  const prevYear = () => setSelectedYear((y) => y - 1);
  const nextYear = () => setSelectedYear((y) => y + 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Monitoring Jurnal Guru"
        subtitle="Pantau seluruh aktivitas pembelajaran yang dicatat oleh guru."
      />

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari guru, mapel, kelas, materi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          {/* Month Picker */}
          <div className="flex items-center gap-2">
            <button onClick={prevYear} className="p-1.5 rounded hover:bg-muted">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium min-w-[32px] text-center">{selectedYear}</span>
            <button onClick={nextYear} className="p-1.5 rounded hover:bg-muted">
              <ChevronRight size={16} />
            </button>
            <select
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(Number(e.target.value)); setPage(1); }}
              className="text-sm bg-background border border-input rounded-lg px-2 py-2 focus:ring-2 focus:ring-brand/30"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="animate-spin text-brand" size={40} />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <BookOpen className="mx-auto mb-4 opacity-40" size={48} />
          <p className="font-medium">Tidak ada jurnal ditemukan</p>
          <p className="text-sm mt-1">Belum ada jurnal pada periode ini atau tidak ada yang cocok dengan pencarian.</p>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tanggal</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Guru</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kelas</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mata Pelajaran</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Materi</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((journal) => (
                  <tr key={journal.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar size={13} />
                        {new Date(journal.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-medium">
                        <User size={13} className="text-muted-foreground" />
                        {journal.teacher?.name || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral">{journal.class?.name || "-"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {journal.subject?.name || "-"}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">
                      {journal.material}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedJournal(journal)}
                      >
                        <Eye size={14} className="mr-1.5" />
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total {meta.total} jurnal</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                <span className="px-2">Hal {page} / {meta.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedJournal && (
        <JournalDetailModal
          journal={selectedJournal}
          onClose={() => setSelectedJournal(null)}
        />
      )}
    </div>
  );
}
