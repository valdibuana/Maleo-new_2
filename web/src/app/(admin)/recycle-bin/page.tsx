"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { apiService } from "@/services/apiService";
import { RefreshCcw, Trash2, AlertCircle } from "lucide-react";

type DataType = "student" | "teacher" | "guardian" | "class" | "subject";

export default function RecycleBinPage() {
  const [activeTab, setActiveTab] = useState<DataType>("student");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [metaInfo, setMetaInfo] = useState<any>(null);

  // Modal Permanent Delete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal Restore
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [itemToRestore, setItemToRestore] = useState<number | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const tabs: { value: DataType; label: string }[] = [
    { value: "student", label: "Siswa" },
    { value: "teacher", label: "Guru" },
    { value: "guardian", label: "Wali Murid" },
    { value: "class", label: "Kelas" },
    { value: "subject", label: "Mata Pelajaran" },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAll("/recycle-bin", { type: activeTab });
      setData(res.data || []);
      setMetaInfo(res.meta);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleRestore = async () => {
    if (!itemToRestore) return;
    setIsRestoring(true);
    try {
      await apiService.update(`/recycle-bin/${activeTab}`, `${itemToRestore}/restore`, {});
      setSuccess("Data berhasil dipulihkan.");
      setIsRestoreModalOpen(false);
      setItemToRestore(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal memulihkan data");
    } finally {
      setIsRestoring(false);
      setTimeout(() => {
        setSuccess("");
        setError("");
      }, 5000);
    }
  };

  const handlePermanentDelete = async () => {
    if (!itemToDelete) return;
    if (confirmText !== "HAPUS PERMANEN") {
      setError("Teks konfirmasi tidak sesuai.");
      return;
    }
    
    setIsDeleting(true);
    try {
      await apiService.remove(`/recycle-bin/${activeTab}`, `${itemToDelete}/permanent`, { data: { confirmText } });
      setSuccess("Data berhasil dihapus permanen.");
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      setConfirmText("");
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menghapus permanen");
    } finally {
      setIsDeleting(false);
      setTimeout(() => {
        setSuccess("");
        setError("");
      }, 5000);
    }
  };

  const renderTable = () => {
    if (loading) {
      return <div className="text-center py-8 text-muted-foreground">Memuat data...</div>;
    }

    if (data.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">Recycle Bin kosong untuk kategori ini.</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-4 font-medium">Nama/Informasi</th>
              <th className="px-6 py-4 font-medium">Dihapus Pada</th>
              <th className="px-6 py-4 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-foreground">{item.name || item.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.nis || item.nip || item.code || item.email || ""}
                  </p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(item.deletedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setItemToRestore(item.id);
                        setIsRestoreModalOpen(true);
                      }}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                    >
                      <RefreshCcw size={14} className="mr-1" /> Pulihkan
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setItemToDelete(item.id);
                        setIsDeleteModalOpen(true);
                      }}
                    >
                      <Trash2 size={14} className="mr-1" /> Hapus Permanen
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Recycle Bin" 
        subtitle="Kelola data yang telah dihapus sementara (soft delete)." 
      />

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}
      {success && <div className="p-4 bg-green-50 text-green-600 rounded-lg border border-green-200">{success}</div>}
      
      {metaInfo && (
        <div className="p-4 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Catatan</p>
            <p className="text-sm">{metaInfo.note}</p>
            {(activeTab === "teacher" || activeTab === "guardian") && (
              <p className="text-sm font-medium mt-1">
                Penting: Setelah memulihkan data Guru/Wali Murid, Anda perlu mereset password akun mereka karena telah dinonaktifkan.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        {renderTable()}
      </Card>

      {/* Restore Modal */}
      <Modal isOpen={isRestoreModalOpen} onClose={() => setIsRestoreModalOpen(false)} title="Konfirmasi Pemulihan">
        <div className="space-y-4">
          <p className="text-muted-foreground">Apakah Anda yakin ingin memulihkan data ini kembali ke sistem aktif?</p>
          {(activeTab === "teacher" || activeTab === "guardian") && (
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
              Perhatian: Password pengguna ini telah direset ke status nonaktif. Anda perlu menghubungi mereka untuk memberikan password baru setelah dipulihkan.
            </p>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsRestoreModalOpen(false)} disabled={isRestoring}>Batal</Button>
            <Button onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? "Memulihkan..." : "Ya, Pulihkan"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Permanent Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Hapus Permanen">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">PERINGATAN KRITIS</p>
              <p className="text-sm mt-1">Data yang dihapus permanen TIDAK BISA dikembalikan. Tindakan ini juga akan menghapus data terkait yang bergantung padanya (jika ada).</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Ketik <span className="font-bold font-mono bg-muted px-1 py-0.5 rounded">HAPUS PERMANEN</span> untuk konfirmasi:
            </label>
            <Input 
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="HAPUS PERMANEN"
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>Batal</Button>
            <Button 
              variant="danger" 
              onClick={handlePermanentDelete} 
              disabled={isDeleting || confirmText !== "HAPUS PERMANEN"}
            >
              {isDeleting ? "Menghapus..." : "Hapus Permanen"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
