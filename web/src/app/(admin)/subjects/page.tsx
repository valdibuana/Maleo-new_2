"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, Clock, Loader2, RefreshCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { apiService } from "@/services/apiService";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    teacherId: "",
    gradeLevel: "",
    hoursPerWeek: "",
  });

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [subsRes, teachRes] = await Promise.all([
        apiService.getAll("/subjects"),
        apiService.getAll("/teachers"),
      ]);
      setSubjects(subsRes.data);
      setTeachers(teachRes.data);
    } catch (err: any) {
      setError("Gagal mengambil data dari server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAdd = () => {
    setEditingSubject(null);
    setFormData({
      code: "",
      name: "",
      teacherId: "",
      gradeLevel: "",
      hoursPerWeek: "",
    });
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const openEdit = (subject: any) => {
    setEditingSubject(subject);
    setFormData({
      code: subject.code,
      name: subject.name,
      teacherId: String(subject.teacherId),
      gradeLevel: String(subject.gradeLevel),
      hoursPerWeek: String(subject.hoursPerWeek),
    });
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (editingSubject) {
        await apiService.update("/subjects", editingSubject.id, formData);
        setSuccess("Mata pelajaran berhasil diperbarui");
      } else {
        await apiService.create("/subjects", formData);
        setSuccess("Mata pelajaran baru berhasil ditambahkan");
      }
      await fetchData();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Hapus mata pelajaran ini?")) return;
    try {
      await apiService.remove("/subjects", id);
      setSuccess("Mata pelajaran berhasil dihapus");
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menghapus data");
    }
  };

  const filtered = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 animate-in fade-in slide-in-from-top-1">{error}</div>}
      {success && <div className="p-4 bg-green-50 text-green-600 rounded-lg border border-green-200 animate-in fade-in slide-in-from-top-1">{success}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Mata Pelajaran</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola daftar mata pelajaran sekolah</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchData}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus size={16} />
            Tambah Mata Pelajaran
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-6">
          <Input placeholder="Cari nama atau kode mata pelajaran..." icon={<Search size={16} />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Memuat data mapel...</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">No</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Kode</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Nama Mata Pelajaran</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground min-w-[200px]">Guru Pengampu</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Kelas</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Jam/Minggu</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((subject, i) => (
                    <tr key={subject.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground">{i + 1}</td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-brand">{subject.code}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{subject.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{subject.teacherName}</td>
                      <td className="py-3 px-4"><Badge variant="info">Kelas {subject.gradeLevel}</Badge></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock size={14} />
                          <span>{subject.hoursPerWeek} jam</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(subject)} className="p-2 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand/10 transition-colors">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDelete(subject.id)} className="p-2 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-muted-foreground">
                      {search ? "Mapel tidak ditemukan." : "Belum ada data mata pelajaran."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingSubject ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran Baru"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Kode Mapel" placeholder="MTK" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} required />
            <Input label="Nama Mapel" placeholder="Matematika" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>
          <SearchableSelect 
            label="Guru Pengampu" 
            options={[
              { value: "", label: "Pilih guru" },
              ...teachers.map(t => ({value: String(t.id), label: t.name}))
            ]} 
            placeholder="Pilih guru" 
            value={formData.teacherId} 
            onChange={e => setFormData({...formData, teacherId: e.target.value})} 
            required 
          />
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Tingkat" 
              options={[{value:"7",label:"VII"},{value:"8",label:"VIII"},{value:"9",label:"IX"}]} 
              placeholder="Pilih tingkat" 
              value={formData.gradeLevel} 
              onChange={e => setFormData({...formData, gradeLevel: e.target.value})} 
              required 
            />
            <Input label="Jam/Minggu" type="number" placeholder="5" value={formData.hoursPerWeek} onChange={e => setFormData({...formData, hoursPerWeek: e.target.value})} required />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" type="button" disabled={isSubmitting} onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : (editingSubject ? "Simpan Perubahan" : "Tambah Mata Pelajaran")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
