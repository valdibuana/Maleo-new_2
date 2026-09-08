"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Plus, Loader2, Calendar, BookMarked } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { apiService } from "@/services/apiService";
import { JournalFormModal } from "./_components/JournalFormModal";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

export default function HubJournalsPage() {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingJournal, setEditingJournal] = useState<any>(null);

  const fetchJournals = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAll("/teacher-journals");
      setJournals(res.data || []);
    } catch (error) {
      console.error("Gagal memuat jurnal", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournals();
  }, []);

  const handleEdit = (journal: any) => {
    setEditingJournal(journal);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus jurnal ini?")) {
      try {
        await apiService.remove("/teacher-journals", id);
        fetchJournals();
      } catch (error) {
        console.error("Gagal menghapus jurnal", error);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Jurnal Mengajar"
        subtitle="Catat dan kelola aktivitas pembelajaran Anda setiap hari."
        actions={
          <Button onClick={() => { setEditingJournal(null); setShowModal(true); }}>
            <Plus className="mr-2" size={18} />
            Buat Jurnal Baru
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-brand" size={40} />
        </div>
      ) : journals.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <BookOpen className="mx-auto mb-4 opacity-50" size={48} />
          <p>Belum ada jurnal mengajar yang dibuat.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {journals.map((journal) => (
            <Card key={journal.id} className="p-5 flex flex-col hover:border-brand/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center text-sm font-medium text-brand bg-brand/10 px-2 py-1 rounded-md">
                  <Calendar size={14} className="mr-1.5" />
                  {fmtDate(journal.date)}
                </div>
              </div>
              <h3 className="font-semibold text-lg line-clamp-2 mb-1">{journal.material}</h3>
              <div className="text-sm text-muted-foreground flex items-center mb-4">
                <BookMarked size={14} className="mr-1.5" />
                {journal.subject?.name} - Kelas {journal.class?.name}
              </div>
              
              <div className="mt-auto pt-4 border-t border-border flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(journal)}>
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(journal.id)}>
                  Hapus
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <JournalFormModal
          journal={editingJournal}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchJournals();
          }}
        />
      )}
    </div>
  );
}
