"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiService } from "@/services/apiService";

interface JournalFormModalProps {
  journal?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function JournalFormModal({ journal, onClose, onSuccess }: JournalFormModalProps) {
  const isEditing = !!journal;
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    date: journal?.date ? new Date(journal.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    classId: journal?.classId || "",
    subjectId: journal?.subjectId || "",
    material: journal?.material || "",
    objective: journal?.objective || "",
    activityNotes: journal?.activityNotes || "",
    constraints: journal?.constraints || "",
    followUp: journal?.followUp || "",
  });

  useEffect(() => {
    const fetchDropdowns = async () => {
      setDataLoading(true);
      try {
        const [clsRes, subRes] = await Promise.all([
          apiService.getAll("/lms/classes"),
          apiService.getAll("/lms/subjects")
        ]);
        setClasses(clsRes.data || []);
        setSubjects(subRes.data || []);
      } catch (err) {
        console.error("Gagal memuat data kelas/mapel", err);
      } finally {
        setDataLoading(false);
      }
    };
    fetchDropdowns();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isEditing) {
        await apiService.update("/teacher-journals", journal.id, formData);
      } else {
        await apiService.create("/teacher-journals", formData);
      }
      onSuccess();
    } catch (err) {
      console.error("Gagal menyimpan jurnal", err);
      alert("Terjadi kesalahan saat menyimpan jurnal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
          <h2 className="text-xl font-semibold text-foreground">
            {isEditing ? "Edit Jurnal Mengajar" : "Buat Jurnal Baru"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {dataLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin text-brand" size={32} />
            </div>
          ) : (
            <form id="journal-form" onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tanggal <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Kelas <span className="text-red-500">*</span></label>
                  <select
                    name="classId"
                    value={formData.classId}
                    onChange={handleChange}
                    required
                    className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium">Mata Pelajaran <span className="text-red-500">*</span></label>
                  <select
                    name="subjectId"
                    value={formData.subjectId}
                    onChange={handleChange}
                    required
                    className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  >
                    <option value="">-- Pilih Mata Pelajaran --</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Materi yang Diajarkan <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="material"
                  value={formData.material}
                  onChange={handleChange}
                  required
                  placeholder="Contoh: Logaritma Lanjut"
                  className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tujuan Pembelajaran <span className="text-red-500">*</span></label>
                <textarea
                  name="objective"
                  value={formData.objective}
                  onChange={handleChange}
                  required
                  rows={2}
                  placeholder="Siswa dapat memahami dan mengaplikasikan..."
                  className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Catatan Kegiatan (Opsional)</label>
                <textarea
                  name="activityNotes"
                  value={formData.activityNotes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Deskripsi singkat kegiatan di kelas..."
                  className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Kendala (Opsional)</label>
                <textarea
                  name="constraints"
                  value={formData.constraints}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Hambatan yang terjadi saat KBM..."
                  className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tindak Lanjut (Opsional)</label>
                <textarea
                  name="followUp"
                  value={formData.followUp}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Rencana perbaikan/PR untuk minggu depan..."
                  className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
                />
              </div>
            </form>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button 
            type="submit" 
            form="journal-form" 
            disabled={loading || dataLoading}
            className="min-w-[120px]"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : (
              <>
                <Save size={18} className="mr-2" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
