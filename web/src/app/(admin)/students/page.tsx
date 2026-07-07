"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, Download, Loader2, Upload, FileSpreadsheet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/axios";
import { apiService } from "@/services/apiService";
import { Student, Grade } from "@/types";
import { enqueueMutation } from "@/lib/offlineQueue";

export default function StudentsPage() {
  // State data
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // UI state
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    nis: "",
    gender: "",
    birthDate: "",
    classId: "",
    phone: "",
    address: "",
  });

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [nameError, setNameError] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  // 1. Fetch data on mount
  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsRes, classesRes] = await Promise.all([
        apiService.getAll("/students"),
        apiService.getAll("/classes"),
      ]);
      
      // Backend mapping: class -> gradeName for frontend compatibility
      const mappedStudents = studentsRes.data.map((s: any) => ({
        ...s,
        gradeName: s.className || "N/A",
        gradeId: s.classId
      }));

      setStudents(mappedStudents);
      setClasses(classesRes.data);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil data dari server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter logic
  const filtered = students.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.nis.includes(search);
    const matchClass = filterClass ? String(s.gradeId) === filterClass : true;
    return matchSearch && matchClass;
  });

  // Modal actions
  const openAdd = () => {
    setEditingStudent(null);
    setFormData({
      name: "",
      nis: "",
      gender: "",
      birthDate: "",
      classId: "",
      phone: "",
      address: "",
    });
    setIsModalOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      nis: student.nis,
      gender: student.gender,
      birthDate: student.birthDate ? student.birthDate.split("T")[0] : "",
      classId: String(student.gradeId),
      phone: student.phone,
      address: student.address,
    });
    setIsModalOpen(true);
  };

  // 2. Handle Submit (POST/PUT) with optimistic updates
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    const previousStudents = [...students];
    const tempId = Date.now(); // temporary ID for optimistic create
    const className = classes.find(c => String(c.id) === formData.classId)?.name || "N/A";

    try {
      if (editingStudent) {
        // Optimistic update
        setStudents(prev => prev.map(s => s.id === editingStudent.id
          ? ({ ...s, ...formData, gradeName: className, gradeId: Number(formData.classId) } as Student)
          : s
        ));
        await apiService.update("/students", editingStudent.id, formData);
        setSuccess("Data siswa berhasil diperbarui");
      } else {
        // Optimistic create
        const optimistic: any = { ...formData, id: tempId, gradeName: className, gradeId: Number(formData.classId), status: "active", userCode: "" };
        setStudents(prev => [...prev, optimistic]);
        const res = await apiService.create("/students", formData);
        setSuccess(
          `✅ ${res.data.name} berhasil ditambahkan. ` +
          `${res.data.disambiguationHint}`
        );
      }
      
      await fetchData(); // refresh with real data
      setIsModalOpen(false);
    } catch (err: any) {
      setStudents(previousStudents); // rollback
      const isNetworkError = !err.response;
      if (isNetworkError) {
        await enqueueMutation("/students", editingStudent ? "PUT" : "POST", formData);
        setError("Gagal menyimpan — perubahan diantrikan untuk sinkronisasi offline");
      } else {
        setError(err.response?.data?.message || "Terjadi kesalahan saat menyimpan data");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Pindahkan data siswa ini ke Recycle Bin?")) return;
    
    const previousStudents = [...students];
    setStudents(prev => prev.filter(s => s.id !== id)); // optimistic remove
    
    try {
      await apiService.remove("/students", id);
      setSuccess("Data siswa berhasil dihapus");
    } catch (err: any) {
      setStudents(previousStudents); // rollback
      const isNetworkError = !err.response;
      if (isNetworkError) {
        await enqueueMutation(`/students/${id}`, "DELETE");
        setError("Gagal menghapus — diantrikan untuk sinkronisasi offline");
      } else {
        setError("Gagal menghapus data");
      }
    }
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const headers = ["Nama Lengkap", "Nis", "Jenis Kelamin", "Tanggal lahir (DD/MM/YYYY)", "Kelas", "Telepon", "Alamat"];
    const exampleRow = ["Budi Santoso", "2024001", "L", "25/06/2010", "7A", "081234567890", "Jl. Merdeka No. 1"];
    const csvContent = headers.join(",") + "\n" + exampleRow.join(",") + "\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Template_Import_Siswa_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export existing students to Excel — using apiService/axios instead of raw fetch
  const handleExportData = async () => {
    setExportLoading(true);
    setError("");
    setSuccess("");
    
    try {
      // Use axios directly for blob response (apiService doesn't support responseType blob)
      const response = await api.get("/students/export", {
        responseType: "blob",
      });
      
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Export_Data_Siswa_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess("Data siswa berhasil diexport.");
    } catch (err: any) {
      console.error("[Export Error]", err);
      
      // Try to extract error message from response
      let errorMsg = "Gagal export data siswa.";
      
      if (err.response) {
        const status = err.response.status;
        if (status === 404) {
          errorMsg = "Endpoint export tidak ditemukan. Silakan hubungi administrator.";
        } else if (status === 401) {
          errorMsg = "Sesi login telah berakhir. Silakan login ulang.";
        } else if (status === 403) {
          errorMsg = "Anda tidak memiliki izin untuk mengexport data.";
        } else if (err.response.data instanceof Blob) {
          // Try to parse error response from blob
          try {
            const text = await err.response.data.text();
            const json = JSON.parse(text);
            errorMsg = json.message || errorMsg;
          } catch {}
        } else if (err.response.data?.message) {
          errorMsg = err.response.data.message;
        }
      } else if (err.code === "ERR_NETWORK") {
        errorMsg = "Koneksi ke server gagal. Pastikan server API berjalan.";
      }
      
      setError(errorMsg);
    } finally {
      setExportLoading(false);
    }
  };

  // Upload Excel handler
  const handleUploadFile = async () => {
    if (!uploadFile) return;
    
    const formData = new FormData();
    formData.append("file", uploadFile);

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiService.create("/students/import", formData);
      
      setSuccess(response.message || "Data siswa berhasil di-import");
      setUploadFile(null);
      await fetchData();
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors && data.errors.length > 0) {
        // Display the first few errors to avoid a massive wall of text
        const errorDetails = data.errors.slice(0, 3).join(" | ");
        const more = data.errors.length > 3 ? "..." : "";
        setError(`${data.message}: ${errorDetails}${more}`);
      } else {
        setError(data?.message || "Gagal meng-import file. Pastikan format benar.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Name validation
  const validateName = (value: string): boolean => {
    const regex = /^[a-zA-Z\s]+$/;
    return regex.test(value);
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg animate-in fade-in slide-in-from-top-1">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-600 rounded-lg animate-in fade-in slide-in-from-top-1">
          {success}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Data Siswa</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola data siswa sekolah secara real-time
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>
            <Download size={16} />
            Template Excel
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleExportData} 
            disabled={exportLoading}
            className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200"
          >
            {exportLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {exportLoading ? "Mengexport..." : "Export Data"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fetchData()}>
            Refresh
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus size={16} />
            Tambah Siswa
          </Button>
        </div>
      </div>

      {/* Upload Excel Section */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FileSpreadsheet size={18} className="text-brand" />
            <span>Import Data Siswa dari Excel/CSV:</span>
          </div>
          <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 file:cursor-pointer cursor-pointer"
            />
            <Button
              size="sm"
              onClick={handleUploadFile}
              disabled={!uploadFile}
            >
              <Upload size={16} />
              Upload
            </Button>
          </div>
          {uploadFile && (
            <p className="text-xs text-muted-foreground">File: {uploadFile.name}</p>
          )}
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 w-full">
            ⚠️ Pastikan kolom <strong>Tanggal lahir</strong> diisi dengan format <strong>DD/MM/YYYY</strong> (contoh: <code>25/06/2010</code>). Download <button onClick={handleDownloadTemplate} className="underline font-semibold cursor-pointer">Template Excel</button> untuk contoh.
          </p>
        </div>
      </Card>

      <Card>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Cari nama atau NIS..."
              icon={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <SearchableSelect
              placeholder="Semua Kelas"
              options={[
                { value: "", label: "Semua Kelas" },
                ...classes.map((c) => ({ value: String(c.id), label: c.name }))
              ]}
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Memuat data siswa...</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">No</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Siswa</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">NIS</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Kode Login</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Kelas</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Jenis Kelamin</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((student, i) => (
                    <tr key={student.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground">{i + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={student.name} size="sm" />
                          <div>
                            <p className="font-medium text-foreground">{student.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.phone
                                ? `📱 ${student.phone}`
                                : `NIS: ${student.nis}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">{student.nis}</td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-brand">{student.userCode || '-'}</td>
                      <td className="py-3 px-4">
                        <Badge variant="info">{student.gradeName}</Badge>
                      </td>
                      <td className="py-3 px-4">{student.gender === "L" ? "Laki-laki" : "Perempuan"}</td>
                      <td className="py-3 px-4">
                        <Badge variant={student.status === "active" ? "success" : "danger"}>
                          {student.status === "active" ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(student)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand/10 transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(student.id)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      Tidak ada data siswa ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingStudent ? "Edit Siswa" : "Tambah Siswa Baru"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {classes.length === 0 && (
            <div className="p-4 bg-brand/10 border border-brand/20 text-brand rounded-lg flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <p className="text-sm font-medium">Data Kelas belum tersedia. Silakan buat Kelas terlebih dahulu di menu Data Kelas.</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nama Lengkap"
              placeholder="Masukkan nama siswa"
              value={formData.name}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, name: val });
                if (val && !validateName(val)) {
                  setNameError("Nama hanya boleh berisi huruf");
                } else {
                  setNameError("");
                }
              }}
              required
            />
            {nameError && (
              <p className="text-xs text-red-500 -mt-3">{nameError}</p>
            )}
            <Input
              label="NIS"
              placeholder="Masukkan NIS"
              value={formData.nis}
              onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
              required
            />
            <Select
              label="Jenis Kelamin"
              options={[
                { value: "L", label: "Laki-laki" },
                { value: "P", label: "Perempuan" },
              ]}
              placeholder="Pilih"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              required
            />
            <Input
              label="Tanggal Lahir"
              type={formData.birthDate ? "date" : "text"}
              placeholder="DD/MM/YYYY"
              onFocus={(e) => (e.target.type = "date")}
              onBlur={(e) => {
                if (!e.target.value) e.target.type = "text";
              }}
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              required
            />
            <SearchableSelect
              label="Kelas"
              options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
              placeholder="Pilih kelas"
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              required
              disabled={classes.length === 0}
            />
            <Input
              label="Telepon"
              placeholder="08xxxxxxxxxx"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <Input
            label="Alamat"
            placeholder="Masukkan alamat lengkap"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="secondary"
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || classes.length === 0}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Menyimpan...
                </>
              ) : (
                editingStudent ? "Simpan Perubahan" : "Tambah Siswa"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}