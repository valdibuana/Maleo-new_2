"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, Users, Loader2, RefreshCcw, X, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { apiService } from "@/services/apiService";

interface Guardian {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  occupation: string;
  userCode: string | null;
  children: { id: number; name: string; className: string }[];
}

export default function GuardiansPage() {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [role, setRole] = useState("admin");
  const [nameError, setNameError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    occupation: "",
  });

  const fetchGuardians = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAll("/guardians");
      setGuardians(response.data);
    } catch (err: any) {
      setError("Gagal mengambil data wali murid");
    } finally {
      setLoading(false);
    }
  };

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);
  const [guardianStudents, setGuardianStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState("");

  const fetchAllStudents = async () => {
    try {
      const res = await apiService.getAll("/students");
      setAllStudents(res.data || []);
    } catch (e) {
      console.error("Gagal mengambil data siswa");
    }
  };

  const openAssignModal = async (guardian: Guardian) => {
    setSelectedGuardian(guardian);
    setIsAssignModalOpen(true);
    try {
      const res = await apiService.getAll(`/guardians/${guardian.id}/students`);
      setGuardianStudents(res.data || []);
    } catch (e) {
      console.error("Gagal mengambil data anak guardian");
    }
  };

  const handleAssignStudent = async () => {
    if (!selectedStudentId) {
      setError("Pilih siswa terlebih dahulu.");
      return;
    }
    if (!selectedGuardian) return;

    setIsSubmitting(true);
    try {
      await apiService.create(
        `/guardians/${selectedGuardian.id}/assign-student`,
        { studentId: selectedStudentId }
      );
      const res = await apiService.getAll(`/guardians/${selectedGuardian.id}/students`);
      setGuardianStudents(res.data || []);
      
      setSelectedStudentId(null);
      setSelectedStudentName("");
      setStudentSearch("");
      setIsStudentDropdownOpen(false);
      
      await fetchGuardians(); // refresh list
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal assign siswa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    if (!selectedGuardian) return;
    if (!window.confirm("Lepas relasi siswa ini dari wali murid?")) return;
    try {
      await apiService.remove(
        `/guardians/${selectedGuardian.id}/remove-student`,
        studentId
      );
      setGuardianStudents(prev => prev.filter(s => s.id !== studentId));
      await fetchGuardians(); // refresh list
    } catch (err: any) {
      alert("Gagal melepas relasi.");
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setRole(user.role || "admin");
    fetchGuardians();
    if (user.role !== "kepala_sekolah") {
      fetchAllStudents();
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-student-selector]")) {
        setIsStudentDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = guardians.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.phone.includes(search)
  );

  const openAdd = () => {
    setEditingGuardian(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      occupation: "",
    });
    setIsModalOpen(true);
  };

  const openEdit = (guardian: Guardian) => {
    setEditingGuardian(guardian);
    setFormData({
      name: guardian.name,
      phone: guardian.phone,
      email: guardian.email,
      address: guardian.address,
      occupation: guardian.occupation,
    });
    setIsModalOpen(true);
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
      if (editingGuardian) {
        await apiService.update("/guardians", editingGuardian.id, formData);
        setSuccess("Data wali murid berhasil diperbarui");
      } else {
        const response = await apiService.create("/guardians", formData);
        const data = response.data;
        
        // Tampilkan info username untuk login
        setSuccess(
          `✅ ${data.name} ${data.disambiguationHint && data.disambiguationHint !== '-' ? `(Wali dari ${data.disambiguationHint})` : ''} berhasil ditambahkan!
          
Email: ${formData.email} (data kontak)
Username Login: "${data.loginUsername}"

⚠️ Catat dan informasikan username ini secara langsung, karena ini yang akan dipakai untuk login pertama kali.`
        );
      }
      await fetchGuardians();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Hapus data wali murid ini?")) return;
    try {
      await apiService.remove("/guardians", id);
      setSuccess("Wali murid berhasil dihapus");
      await fetchGuardians();
    } catch (err) {
      setError("Gagal menghapus data");
    }
  };

  const availableStudents = allStudents
    .filter(s => !guardianStudents.find(gs => gs.id === s.id));

  const filteredStudents = availableStudents.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.nis?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.class?.name?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}
      {success && <div className="p-4 bg-green-50 text-green-600 rounded-lg border border-green-200">{success}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Data Wali Murid</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola data orang tua/wali murid</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchGuardians}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
          {role !== "kepala_sekolah" && (
            <Button size="sm" onClick={openAdd}>
              <Plus size={16} />
              Tambah Wali Murid
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="mb-6">
          <Input placeholder="Cari nama atau telepon..." icon={<Search size={16} />} value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Wali Murid</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Kode Login</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Telepon</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Pekerjaan</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Anak</th>
                  {role !== "kepala_sekolah" && <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((guardian, i) => (
                  <tr key={guardian.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground">{i + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={guardian.name} size="sm" />
                        <div>
                          <p className="font-medium text-foreground">{guardian.name}</p>
                          <p className="text-xs text-muted-foreground">{guardian.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-brand">{guardian.userCode || '-'}</td>
                    <td className="py-3 px-4 text-muted-foreground">{guardian.phone}</td>
                    <td className="py-3 px-4">{guardian.occupation}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        {guardian.children && guardian.children.length > 0 ? (
                          guardian.children.map((child) => (
                            <div key={child.id} className="flex items-center gap-2">
                              <Badge variant="info">{child.name}</Badge>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Belum ada</span>
                        )}
                      </div>
                    </td>
                    {role !== "kepala_sekolah" && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="secondary" size="sm" onClick={() => openAssignModal(guardian)} className="text-brand hover:bg-brand/10 h-8 px-2 mr-2">
                            <Users size={16} className="mr-1" /> Kelola Anak
                          </Button>
                          <button onClick={() => openEdit(guardian)} className="p-2 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand/10 transition-colors">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDelete(guardian.id)} className="p-2 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingGuardian ? "Edit Wali Murid" : "Tambah Wali Murid Baru"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nama Lengkap" placeholder="Masukkan nama" value={formData.name} onChange={e => {
              const val = e.target.value;
              setFormData({...formData, name: val});
              if (val && !validateName(val)) setNameError("Nama hanya boleh berisi huruf");
              else setNameError("");
            }} required />
            {nameError && <p className="text-xs text-red-500 -mt-3">{nameError}</p>}
            <Input label="Telepon" placeholder="08xxxxxxxxxx" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
            <Input label="Email" type="email" placeholder="email@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            <Input label="Pekerjaan" placeholder="Masukkan pekerjaan" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} required />
          </div>
          <Input label="Alamat" placeholder="Masukkan alamat lengkap" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" type="button" disabled={isSubmitting} onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : (editingGuardian ? "Simpan Perubahan" : "Tambah Wali Murid")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title={`Kelola Anak — ${selectedGuardian?.name}`} size="lg">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Anak Terdaftar:</p>
            {guardianStudents.length > 0 ? (
              <div className="space-y-2">
                {guardianStudents.map(student => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-sm text-foreground">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.nis} • {student.class?.name}</p>
                    </div>
                    <button onClick={() => handleRemoveStudent(student.id)} className="text-red-500 hover:bg-red-50 hover:text-red-600 p-1 rounded transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Belum ada anak yang terhubung.</p>
            )}
          </div>

          <div className="border-t pt-4 border-border">
            <p className="text-sm font-medium mb-2">Hubungkan Siswa Baru:</p>
            <div className="flex gap-2 items-end">
              <div className="relative flex-1" data-student-selector>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Cari & Pilih Siswa
                </label>

                {/* Input search dengan preview siswa terpilih */}
                <div
                  className="flex items-center gap-2 w-full rounded-lg border
                    border-input bg-card px-3 py-2 cursor-pointer
                    hover:border-ring transition-colors h-10"
                  onClick={() => setIsStudentDropdownOpen(prev => !prev)}
                >
                  {selectedStudentId ? (
                    // State: sudah ada siswa terpilih
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {selectedStudentName}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                          {availableStudents.find(
                            s => s.id === selectedStudentId
                          )?.nis || ""} •{" "}
                          {availableStudents.find(
                            s => s.id === selectedStudentId
                          )?.class?.name || ""}
                        </p>
                      </div>
                      {/* Tombol clear pilihan */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudentId(null);
                          setSelectedStudentName("");
                          setStudentSearch("");
                        }}
                        className="p-1 rounded hover:bg-muted transition-colors
                          text-muted-foreground hover:text-foreground"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    // State: belum ada siswa terpilih
                    <div className="flex items-center gap-2 w-full h-full">
                      <Search size={14} className="text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        placeholder="Ketik nama, NIS, atau kelas..."
                        value={studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          setIsStudentDropdownOpen(true);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-sm bg-transparent outline-none
                          text-foreground placeholder:text-muted-foreground h-full"
                      />
                      {studentSearch && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudentSearch("");
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Dropdown hasil pencarian */}
                {isStudentDropdownOpen && !selectedStudentId && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1
                    bg-card border border-border rounded-lg shadow-lg
                    max-h-56 overflow-y-auto">

                    {filteredStudents.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-muted-foreground">
                          {studentSearch
                            ? `Tidak ada siswa dengan "${studentSearch}"`
                            : availableStudents.length === 0
                            ? "Semua siswa sudah terhubung ke wali murid ini"
                            : "Belum ada data siswa"}
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Counter hasil */}
                        <div className="px-3 py-2 border-b border-border/50">
                          <p className="text-[10px] text-muted-foreground">
                            {filteredStudents.length} siswa ditemukan
                            {studentSearch && ` untuk "${studentSearch}"`}
                          </p>
                        </div>

                        {/* List siswa */}
                        {filteredStudents.map(student => (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => {
                              setSelectedStudentId(student.id);
                              setSelectedStudentName(student.name);
                              setStudentSearch("");
                              setIsStudentDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-between
                              px-4 py-2.5 text-left hover:bg-muted/50
                              transition-colors border-b border-border/30
                              last:border-0"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {student.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                NIS: {student.nis || "-"} •{" "}
                                {student.class?.name || "Belum ada kelas"}
                              </p>
                            </div>
                            <ChevronRight size={14}
                              className="text-muted-foreground shrink-0" />
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
              <Button onClick={handleAssignStudent} disabled={!selectedStudentId || isSubmitting} className="h-10">
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : "Hubungkan"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
