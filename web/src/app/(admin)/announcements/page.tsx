"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, Megaphone, Eye, EyeOff, Loader2, RefreshCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { apiService } from "@/services/apiService";
import { formatDate } from "@/lib/utils";

const priorityConfig: Record<string, { variant: "success" | "warning" | "danger" | "neutral"; label: string }> = {
  normal: { variant: "neutral", label: "Normal" },
  important: { variant: "warning", label: "Penting" },
  urgent: { variant: "danger", label: "Urgent" },
};
const targetConfig: Record<string, string> = {
  all: "Semua",
  teacher: "Guru",
  student: "Siswa",
  guardian: "Wali Murid",
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    target: "all",
    priority: "normal",
    isPublished: false,
    author: "Admin Maleo", // Default author for now
  });

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAll("/announcements");
      setAnnouncements(response.data);
    } catch (err: any) {
      setError("Gagal mengambil data pengumuman");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openAdd = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: "",
      content: "",
      target: "all",
      priority: "normal",
      isPublished: true,
      author: "Admin Maleo",
    });
    setIsModalOpen(true);
  };

  const openEdit = (ann: any) => {
    setEditingAnnouncement(ann);
    setFormData({
      title: ann.title,
      content: ann.content,
      target: ann.target,
      priority: ann.priority,
      isPublished: ann.isPublished,
      author: ann.author,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent, forceDraft = false) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    const payload = { ...formData, isPublished: forceDraft ? false : formData.isPublished };

    try {
      if (editingAnnouncement) {
        await apiService.update("/announcements", editingAnnouncement.id, payload);
        setSuccess("Pengumuman berhasil diperbarui");
      } else {
        await apiService.create("/announcements", payload);
        setSuccess("Pengumuman baru berhasil dibuat");
      }
      await fetchAnnouncements();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublish = async (ann: any) => {
    try {
      await apiService.update("/announcements", ann.id, { isPublished: !ann.isPublished });
      setSuccess(`Pengumuman berhasil ${ann.isPublished ? "diarsipkan" : "diterbitkan"}`);
      await fetchAnnouncements();
    } catch (err) {
      setError("Gagal memperbarui status pengumuman");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Hapus pengumuman ini?")) return;
    try {
      await apiService.remove("/announcements", id);
      setSuccess("Pengumuman berhasil dihapus");
      await fetchAnnouncements();
    } catch (err) {
      setError("Gagal menghapus pengumuman");
    }
  };

  const filtered = announcements.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 animate-in fade-in slide-in-from-top-1">{error}</div>}
      {success && <div className="p-4 bg-green-50 text-green-600 rounded-lg border border-green-200 animate-in fade-in slide-in-from-top-1">{success}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Pengumuman</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola pengumuman sekolah</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchAnnouncements}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus size={16} />
            Buat Pengumuman
          </Button>
        </div>
      </div>

      <div className="max-w-md">
        <Input placeholder="Cari pengumuman..." icon={<Search size={16} />} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>Memuat pengumuman...</p>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((announcement) => {
            const priority = priorityConfig[announcement.priority] || priorityConfig.normal;
            return (
              <Card key={announcement.id} className="group hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${announcement.isPublished ? "bg-brand/10" : "bg-slate-100"}`}>
                    <Megaphone size={20} className={announcement.isPublished ? "text-brand" : "text-slate-400"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-semibold text-foreground tracking-tight font-bold">{announcement.title}</h3>
                      <Badge variant={priority.variant}>{priority.label}</Badge>
                      <Badge variant={announcement.isPublished ? "success" : "neutral"}>
                        {announcement.isPublished ? "Terbit" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{announcement.content}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Target: <strong>{targetConfig[announcement.target] || "Semua"}</strong></span>
                      <span>Oleh: {announcement.author}</span>
                      <span>{formatDate(announcement.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button 
                      onClick={() => handleTogglePublish(announcement)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand/10 transition-colors" 
                      title={announcement.isPublished ? "Sembunyikan" : "Terbitkan"}
                    >
                      {announcement.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button onClick={() => openEdit(announcement)} className="p-2 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand/10 transition-colors">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(announcement.id)} className="p-2 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="py-20 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
            {search ? "Pengumuman tidak ditemukan." : "Belum ada pengumuman."}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingAnnouncement ? "Edit Pengumuman" : "Buat Pengumuman Baru"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Judul" placeholder="Masukkan judul pengumuman" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Isi Pengumuman</label>
            <textarea
              className="flex w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground min-h-[120px] focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              placeholder="Tulis isi pengumuman..."
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Target" options={[{value:"all",label:"Semua"},{value:"teacher",label:"Guru"},{value:"student",label:"Siswa"},{value:"guardian",label:"Wali Murid"}]} placeholder="Pilih target" value={formData.target} onChange={e => setFormData({...formData, target: e.target.value})} />
            <Select label="Prioritas" options={[{value:"normal",label:"Normal"},{value:"important",label:"Penting"},{value:"urgent",label:"Urgent"}]} placeholder="Pilih prioritas" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-accent transition-colors">
            <input type="checkbox" checked={formData.isPublished} onChange={e => setFormData({...formData, isPublished: e.target.checked})} className="rounded border-border text-brand" />
            <span className="text-sm font-medium">Terbitkan Langsung</span>
          </label>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" type="button" disabled={isSubmitting} onClick={() => setIsModalOpen(false)}>Batal</Button>
            {!editingAnnouncement && <Button variant="ghost" type="button" disabled={isSubmitting} onClick={(e) => handleSubmit(e, true)}>Simpan Draft</Button>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : (editingAnnouncement ? "Simpan Perubahan" : "Terbitkan Pengumuman")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
