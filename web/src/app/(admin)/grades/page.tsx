"use client";

import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Users, Loader2, RefreshCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { apiService } from "@/services/apiService";
import { enqueueMutation } from "@/lib/offlineQueue";

const gradeColors = [
  "from-brand-light to-brand",
  "from-brand-light to-brand",
  "from-violet-500 to-brand",
  "from-brand-light to-brand",
  "from-rose-500 to-pink-500",
  "from-sky-500 to-cyan-500",
];

export default function GradesPage() {
  const [gradesData, setGradesData] = useState<any[]>([]);
  const [teachersData, setTeachersData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    level: "",
    homeroomTeacherId: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gradesRes, teachersRes] = await Promise.all([
        apiService.getAll("/classes"),
        apiService.getAll("/teachers"),
      ]);
      setGradesData(gradesRes.data);
      setTeachersData(teachersRes.data);
    } catch (err: any) {
      setError("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAdd = () => {
    setEditingGrade(null);
    setFormData({
      name: "",
      level: "",
      homeroomTeacherId: "",
    });
    setIsModalOpen(true);
  };

  const openEdit = (grade: any) => {
    setEditingGrade(grade);
    setFormData({
      name: grade.name,
      level: String(grade.level),
      homeroomTeacherId: String(grade.homeroomTeacherId),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    const romanMap: Record<string, string> = { "7": "VII", "8": "VIII", "9": "IX", "10": "X", "11": "XI", "12": "XII" };
    const payload = {
      ...formData,
      level: Number(formData.level),
      name: romanMap[formData.level] || formData.level,
    };

    const previousGrades = [...gradesData];
    const tempId = Date.now();

    try {
      if (editingGrade) {
        // Optimistic update
        setGradesData(prev => prev.map(g => g.id === editingGrade.id
          ? { ...g, ...payload, homeroomTeacherName: teachersData.find(t => String(t.id) === formData.homeroomTeacherId)?.name || g.homeroomTeacherName }
          : g
        ));
        await apiService.update("/classes", editingGrade.id, payload);
        setSuccess("Data kelas berhasil diperbarui");
      } else {
        // Optimistic create
        const teacherName = teachersData.find(t => String(t.id) === formData.homeroomTeacherId)?.name || "";
        setGradesData(prev => [...prev, { ...payload, id: tempId, homeroomTeacherName: teacherName, studentCount: 0 }]);
        await apiService.create("/classes", payload);
        setSuccess("Kelas baru berhasil ditambahkan");
      }
      await fetchData();
      setIsModalOpen(false);
    } catch (err: any) {
      setGradesData(previousGrades); // rollback
      const isNetworkError = !err.response;
      if (isNetworkError) {
        await enqueueMutation("/classes", editingGrade ? "PUT" : "POST", payload);
        setError("Gagal menyimpan — perubahan diantrikan untuk sinkronisasi offline");
      } else {
        const serverMessage = err.response?.data?.message;
        setError(serverMessage || "Gagal menyimpan data. Silakan cek koneksi atau inputan Anda.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Hapus kelas ini?")) return;
    const previousGrades = [...gradesData];
    setGradesData(prev => prev.filter(g => g.id !== id)); // optimistic remove
    try {
      await apiService.remove("/classes", id);
      setSuccess("Kelas berhasil dihapus");
    } catch (err: any) {
      setGradesData(previousGrades); // rollback
      const isNetworkError = !err.response;
      if (isNetworkError) {
        await enqueueMutation(`/classes/${id}`, "DELETE");
        setError("Gagal menghapus — diantrikan untuk sinkronisasi offline");
      } else {
        setError(err.response?.data?.message || "Gagal menghapus data");
      }
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}
      {success && <div className="p-4 bg-green-50 text-green-600 rounded-lg border border-green-200">{success}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Data Kelas</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola kelas dan wali kelas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchData}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus size={16} />
            Tambah Kelas
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="animate-spin mb-2" size={32} />
          <p>Memuat data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gradesData.length === 0 ? (
            <div className="col-span-full py-20 text-center text-muted-foreground">
              Belum ada data kelas.
            </div>
          ) : (
            gradesData.map((grade, i) => (
              <Card key={grade.id} className="relative overflow-hidden group">
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${gradeColors[i % gradeColors.length]}`} />
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground tracking-tight">{grade.name}</h3>
                    <p className="text-xs text-muted-foreground">Tingkat {grade.level}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(grade)} className="p-1.5 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand/10 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(grade.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-3 p-2.5 rounded-lg bg-accent/50">
                  <Avatar name={grade.homeroomTeacherName || "T"} size="sm" />
                  <div>
                    <p className="text-xs text-muted-foreground">Wali Kelas</p>
                    <p className="text-sm font-medium text-foreground">{grade.homeroomTeacherName || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users size={16} />
                  <span>{grade.studentCount || 0} siswa</span>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingGrade ? "Edit Kelas" : "Tambah Kelas Baru"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {teachersData.length === 0 && (
            <div className="p-4 bg-brand/10 border border-brand/20 text-brand rounded-lg flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <p className="text-sm font-medium">Data Guru masih kosong. Anda wajib menambahkan minimal 1 Guru di menu Data Guru untuk dijadikan Wali Kelas.</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4">
            <Select label="Tingkat" options={[{value:"7",label:"VII"},{value:"8",label:"VIII"},{value:"9",label:"IX"},{value:"10",label:"X"},{value:"11",label:"XI"},{value:"12",label:"XII"}]} placeholder="Pilih tingkat" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} required />
          </div>
          <Select 
            label="Wali Kelas" 
            options={teachersData.map(t => ({value: String(t.id), label: t.name}))} 
            placeholder="Pilih guru" 
            value={formData.homeroomTeacherId} 
            onChange={e => setFormData({...formData, homeroomTeacherId: e.target.value})} 
            required
            disabled={teachersData.length === 0}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" type="button" disabled={isSubmitting} onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting || teachersData.length === 0}>
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : (editingGrade ? "Simpan Perubahan" : "Tambah Kelas")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
