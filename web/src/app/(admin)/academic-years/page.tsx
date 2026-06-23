"use client";

import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, Loader2, RefreshCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { apiService } from "@/services/apiService";
import { formatDate } from "@/lib/utils";

export default function AcademicYearsPage() {
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    semester: "",
    startDate: "",
    endDate: "",
    isActive: false,
  });

  const fetchYears = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAll("/academic-years");
      setYears(response.data);
    } catch (err: any) {
      setError("Gagal mengambil data tahun ajaran");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  const openAdd = () => {
    setEditingYear(null);
    setFormData({
      name: "",
      semester: "Ganjil",
      startDate: "",
      endDate: "",
      isActive: false,
    });
    setIsModalOpen(true);
  };

  const openEdit = (year: any) => {
    setEditingYear(year);
    setFormData({
      name: year.name,
      semester: year.semester,
      startDate: year.startDate,
      endDate: year.endDate,
      isActive: year.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (editingYear) {
        await apiService.update("/academic-years", editingYear.id, formData);
        setSuccess("Tahun ajaran berhasil diperbarui");
      } else {
        await apiService.create("/academic-years", formData);
        setSuccess("Tahun ajaran baru berhasil ditambahkan");
      }
      await fetchYears();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetActive = async (year: any) => {
    if (year.isActive) return;
    setLoading(true);
    try {
      await apiService.update("/academic-years", year.id, { ...year, isActive: true });
      setSuccess(`${year.name} ${year.semester} sekarang aktif`);
      await fetchYears();
    } catch (err: any) {
      setError("Gagal mengaktifkan tahun ajaran");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      await apiService.remove("/academic-years", id);
      setSuccess("Tahun ajaran berhasil dihapus");
      await fetchYears();
    } catch (err: any) {
      setError("Gagal menghapus data");
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 animate-in fade-in slide-in-from-top-1">{error}</div>}
      {success && <div className="p-4 bg-green-50 text-green-600 rounded-lg border border-green-200 animate-in fade-in slide-in-from-top-1">{success}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tahun Ajaran</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola tahun ajaran dan semester aktif</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchYears}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus size={16} />
            Tambah Tahun Ajaran
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>Memuat data...</p>
          </div>
        ) : years.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
            Belum ada data tahun ajaran. Silakan tambahkan satu untuk memulai.
          </div>
        ) : (
          years.map((year) => (
            <Card key={year.id} className={`relative overflow-hidden transition-all hover:shadow-md ${year.isActive ? "ring-2 ring-brand shadow-indigo-100" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-foreground tracking-tight">{year.name}</h3>
                    <Badge variant="info">{year.semester}</Badge>
                    {year.isActive && <Badge variant="success">Aktif</Badge>}
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Mulai: {formatDate(year.startDate)}</p>
                    <p>Selesai: {formatDate(year.endDate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!year.isActive && (
                    <button onClick={() => handleSetActive(year)} className="p-2 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand/10 transition-colors" title="Set Aktif">
                      <CheckCircle2 size={18} />
                    </button>
                  )}
                  <button onClick={() => openEdit(year)} className="p-2 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand/10 transition-colors" title="Edit">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(year.id)} className="p-2 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors" title="Hapus">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              {year.isActive && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-light to-brand" />}
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingYear ? "Edit Tahun Ajaran" : "Tambah Tahun Ajaran Baru"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nama (contoh: 2025/2026)" placeholder="2025/2026" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <Select label="Semester" options={[{value:"Ganjil",label:"Ganjil"},{value:"Genap",label:"Genap"}]} placeholder="Pilih semester" value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tanggal Mulai" type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required />
            <Input label="Tanggal Selesai" type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required />
          </div>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-accent transition-colors">
            <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="rounded border-border text-brand" />
            <span className="text-sm font-medium">Set sebagai Tahun Ajaran Aktif</span>
          </label>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" type="button" disabled={isSubmitting} onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : (editingYear ? "Simpan Perubahan" : "Tambah Tahun Ajaran")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
