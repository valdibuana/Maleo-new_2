"use client";

import React, { useState, useEffect } from "react";
import { UserPlus, Search, RefreshCcw, Trash2, ShieldCheck, Loader2, Info, Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { apiService } from "@/services/apiService";

const emptyForm = { name: "", nip: "", phone: "", gender: "", email: "", address: "" };

export default function PrincipalManagement() {
  const [principals, setPrincipals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editingPrincipal, setEditingPrincipal] = useState<any | null>(null);

  const fetchPrincipals = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAll("/principals");
      setPrincipals(res.data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPrincipals(); }, []);

  const openAdd = () => { setEditingPrincipal(null); setFormData(emptyForm); setIsModalOpen(true); };
  const openEdit = (p: any) => {
    setEditingPrincipal(p);
    setFormData({ name: p.name ?? "", nip: p.nip ?? "", phone: p.phone ?? "", gender: p.gender ?? "", email: p.email ?? "", address: p.address ?? "" });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingPrincipal) {
        await apiService.update("/principals", editingPrincipal.id, formData);
      } else {
        await apiService.create("/principals", formData);
      }
      setIsModalOpen(false);
      setFormData(emptyForm);
      setEditingPrincipal(null);
      fetchPrincipals();
    } catch (error: any) {
      alert(error.response?.data?.message || "Gagal menyimpan data.");
    } finally { setIsSubmitting(false); }
  };

  const handleResetPassword = async (id: number, code: string) => {
    if (!confirm(`Reset password ke kode sistem (${code})? User wajib ganti password saat login berikutnya.`)) return;
    try {
      const res = await apiService.create(`/principals/${id}/reset-password`, {});
      alert(res.message || "Password berhasil direset.");
    } catch { alert("Gagal mereset password."); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus data Kepala Sekolah ini? Akun login juga akan dihapus secara permanen.")) return;
    try {
      await apiService.remove("/principals", id);
      fetchPrincipals();
    } catch (error: any) { alert(error.response?.data?.message || "Gagal menghapus data."); }
  };

  const filteredData = principals.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.nip.includes(search)
  );

  const field = (key: keyof typeof emptyForm) => ({
    value: formData[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFormData({ ...formData, [key]: e.target.value }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Data Kepala Sekolah</h1>
          <p className="text-sm text-muted-foreground mt-1">Manajemen akun dan profil pimpinan sekolah</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <UserPlus size={18} /> Tambah Kepala Sekolah
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input placeholder="Cari nama atau NIP..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="secondary" size="sm" onClick={fetchPrincipals} disabled={loading}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/30 text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-4">Nama / NIP</th>
                <th className="px-6 py-4">Kode Sistem</th>
                <th className="px-6 py-4">Telepon</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  <Loader2 className="animate-spin mx-auto mb-2" size={24} />Memuat data...
                </td></tr>
              ) : filteredData.length > 0 ? filteredData.map(p => (
                <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">NIP: {p.nip}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-brand font-bold">{p.principalCode}</td>
                  <td className="px-6 py-4 text-sm">{p.phone || "-"}</td>
                  <td className="px-6 py-4 text-sm">{p.email || "-"}</td>
                  <td className="px-6 py-4">
                    <Badge variant={p.status === "active" ? "success" : "neutral"}>
                      {p.status === "active" ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="text-brand hover:text-brand hover:bg-brand/10" title="Edit">
                      <Pencil size={18} />
                    </Button>
                    <Button variant="ghost" size="sm" title="Reset Password" onClick={() => handleResetPassword(p.id, p.principalCode)} className="text-brand hover:text-brand hover:bg-brand/10">
                      <ShieldCheck size={18} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50" title="Hapus">
                      <Trash2 size={18} />
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  Belum ada data Kepala Sekolah.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingPrincipal ? "Edit Kepala Sekolah" : "Tambah Kepala Sekolah Baru"}>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nama Lengkap" placeholder="Masukkan nama lengkap" required {...field("name")} />
            <Input label="NIP" placeholder="Contoh: 198701012010011001" required {...field("nip")} />
            <SearchableSelect label="Jenis Kelamin"
              options={[{ value: "", label: "Pilih Jenis Kelamin" }, { value: "L", label: "Laki-laki" }, { value: "P", label: "Perempuan" }]}
              placeholder="Pilih Jenis Kelamin"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })} />
            <Input label="Telepon" placeholder="08xxxxxxxxxx" {...field("phone")} />
            <Input label="Email" type="email" placeholder="email@sekolah.sch.id" {...field("email")} />
            <Input label="Alamat" placeholder="Jl. ..." {...field("address")} />
          </div>

          {!editingPrincipal && (
            <div className="p-4 bg-brand/10 border border-brand/20 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-brand font-bold text-sm">
                <Info size={16} /> Logika Sistem Otomatis
              </div>
              <ul className="text-xs text-brand space-y-1 list-disc ml-4">
                <li>Sistem akan menghasilkan kode <b>Kxxx</b> secara otomatis.</li>
                <li>Password default adalah <b>kode sistem tersebut</b> (contoh: K001).</li>
                <li>Akun wajib ganti password saat login pertama.</li>
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Batal</Button>
            <Button type="submit" disabled={isSubmitting || !formData.name || !formData.nip}>
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : editingPrincipal ? "Simpan Perubahan" : "Tambah Kepala Sekolah"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
