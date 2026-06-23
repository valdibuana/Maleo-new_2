"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, Loader2, RefreshCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { apiService } from "@/services/apiService";
import { Teacher } from "@/types";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [nameError, setNameError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    nip: "",
    gender: "",
    email: "",
    phone: "",
    subject: "",
    subjectIds: [] as number[],
    status: "active",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teachersRes, subjectsRes] = await Promise.all([
        apiService.getAll("/teachers"),
        apiService.getAll("/subjects"),
      ]);
      setTeachers(teachersRes.data);
      setSubjects(subjectsRes.data);
    } catch (err: any) {
      setError("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.nip.includes(search) ||
      (t.subject && t.subject.toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd = () => {
    setEditingTeacher(null);
    setFormData({
      name: "",
      nip: "",
      gender: "",
      email: "",
      phone: "",
      subject: "",
      subjectIds: [],
      status: "active",
    });
    setIsModalOpen(true);
  };

  const openEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      nip: teacher.nip,
      gender: teacher.gender,
      email: teacher.email,
      phone: teacher.phone,
      subject: teacher.subject || "",
      subjectIds: teacher.subjects?.map((s: any) => s.id) || [],
      status: teacher.status || "active",
    });
    setIsModalOpen(true);
  };

  const toggleSubject = (id: number) => {
    setFormData(prev => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(id) 
        ? prev.subjectIds.filter(sId => sId !== id)
        : [...prev.subjectIds, id]
    }));
  };

  // Name validation
  const validateName = (value: string): boolean => {
    const regex = /^[a-zA-Z\s]+$/;
    return regex.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (editingTeacher) {
        await apiService.update("/teachers", editingTeacher.id, formData);
        setSuccess("Data guru berhasil diperbarui");
      } else {
        const response = await apiService.create("/teachers", formData);
        const data = response.data;
        
        // Tampilkan info username untuk login
        setSuccess(
          `✅ ${data.name} ${data.disambiguationHint ? `(${data.disambiguationHint})` : ''} berhasil ditambahkan!
          
Username Login: "${data.loginUsername}"

⚠️ Catat dan informasikan username ini secara langsung, karena ini yang akan dipakai untuk login pertama kali.`
        );
      }
      await fetchData();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Hapus data guru ini?")) return;
    try {
      await apiService.remove("/teachers", id);
      setSuccess("Guru berhasil dihapus");
      await fetchData();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Gagal menghapus data";
      setError(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}
      {success && <div className="p-4 bg-green-50 text-green-600 rounded-lg border border-green-200">{success}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Data Guru</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola data guru dan tenaga pengajar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchData}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus size={16} />
            Tambah Guru
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-6">
          <Input
            placeholder="Cari nama, NIP, atau mapel..."
            icon={<Search size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Memuat data...</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">No</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Guru</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">NIP</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Kode Login</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Mata Pelajaran</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((teacher, i) => (
                  <tr key={teacher.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground">{i + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={teacher.name} size="sm" />
                        <div>
                          <p className="font-medium text-foreground">{teacher.name}</p>
                          <p className="text-xs text-muted-foreground">{teacher.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{teacher.nip}</td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-brand">{teacher.userCode || '-'}</td>
                    <td className="py-3 px-4">
                      {teacher.subjects && teacher.subjects.length > 0 
                        ? <div className="flex flex-wrap gap-1">{teacher.subjects.map((s: any) => <Badge key={s.id} variant="info">{s.name}</Badge>)}</div> 
                        : (teacher.subject ? <Badge variant="info">{teacher.subject}</Badge> : '-')}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={teacher.status === "active" ? "success" : "danger"}>
                        {teacher.status === "active" ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(teacher)} className="p-2 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand/10 transition-colors">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(teacher.id)} className="p-2 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingTeacher ? "Edit Guru" : "Tambah Guru Baru"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {subjects.length === 0 && (
            <div className="p-3 bg-brand/10 border border-brand/20 text-brand text-xs rounded-lg flex items-center gap-2">
              <span>⚠️ Data Mata Pelajaran kosong. Anda bisa mengabaikan ini jika guru belum ditugaskan, atau buat Mata Pelajaran terlebih dahulu.</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nama Lengkap" placeholder="Masukkan nama guru" value={formData.name} onChange={e => {
              const val = e.target.value;
              setFormData({...formData, name: val});
              if (val && !validateName(val)) setNameError("Nama hanya boleh berisi huruf");
              else setNameError("");
            }} required />
            {nameError && <p className="text-xs text-red-500 -mt-3">{nameError}</p>}
            <Input label="NIP" placeholder="Masukkan NIP" value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} required />
            <Select label="Jenis Kelamin" options={[{value:"L",label:"Laki-laki"},{value:"P",label:"Perempuan"}]} placeholder="Pilih" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} required />
            <Input label="Email" type="email" placeholder="email@maleo.sch.id" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
            <Input label="Telepon" placeholder="08xxxxxxxxxx" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
            <div className="space-y-2 col-span-1 sm:col-span-2">
              <label className="text-sm font-medium">Mata Pelajaran yang Diajar</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {subjects.map(subject => (
                  <label key={subject.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.subjectIds.includes(subject.id)}
                      onChange={() => toggleSubject(subject.id)}
                      className="rounded"
                    />
                    {subject.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" type="button" disabled={isSubmitting} onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : (editingTeacher ? "Simpan Perubahan" : "Tambah Guru")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
