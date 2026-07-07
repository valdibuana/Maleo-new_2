"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { apiService } from "@/services/apiService";
import { MessageCircle, Send, Loader2, Plus, Trash2 } from "lucide-react";

export default function ConsultationsPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newForm, setNewForm] = useState({ receiverId: "", subject: "", message: "" });
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(u);
    fetchThreads();
    fetchTeachers();
  }, []);

  const fetchThreads = async () => {
    try {
      const res = await apiService.getAll("/connect/consultations");
      setThreads(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await apiService.getAll("/connect/teachers");
      setTeachers(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const selectThread = async (id: number) => {
    try {
      const res = await apiService.getById("/connect/consultations", id);
      setSelectedThread(res.data);
      // Refresh list to update read status
      fetchThreads();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiService.create("/connect/consultations", newForm);
      setIsNewModalOpen(false);
      setNewForm({ receiverId: "", subject: "", message: "" });
      fetchThreads();
    } catch (e: any) {
      alert(e.response?.data?.message || "Gagal membuat konsultasi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedThread) return;
    setSubmitting(true);
    try {
      await apiService.create(`/connect/consultations/${selectedThread.id}/reply`, {
        message: replyMessage
      });
      setReplyMessage("");
      // Refresh thread
      selectThread(selectedThread.id);
    } catch (e: any) {
      alert("Gagal membalas.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteThread = async (id: number) => {
    if (!confirm(
      "Hapus konsultasi ini? Semua balasan di dalamnya " +
      "juga akan ikut terhapus. Tindakan ini tidak bisa dibatalkan."
    )) return;

    try {
      await apiService.remove("/connect/consultations", id);
      setSuccess("Konsultasi berhasil dihapus.");
      fetchConsultations(); // refresh list
      if (selectedThread?.id === id) setSelectedThread(null);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menghapus konsultasi.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const fetchConsultations = () => {
    fetchThreads();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unread": return <Badge variant="danger">Belum Dibaca</Badge>;
      case "read": return <Badge variant="neutral">Sudah Dibaca</Badge>;
      case "replied": return <Badge variant="success">Sudah Dibalas</Badge>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}
      {success && <div className="p-4 bg-green-50 text-green-600 rounded-lg border border-green-200">{success}</div>}

      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Konsultasi ke Guru</h1>
          <p className="text-muted-foreground mt-1">Berkomunikasi langsung dengan guru pengampu anak Anda.</p>
        </div>
        <Button onClick={() => setIsNewModalOpen(true)}>
          <Plus size={16} /> Konsultasi Baru
        </Button>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Panel Kiri - List Thread */}
        <Card className="w-1/3 flex flex-col min-h-0 border-border">
          <div className="p-4 border-b border-border bg-muted/30">
            <h3 className="font-bold tracking-tight">Riwayat Pesan</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {threads.length > 0 ? (
              threads.map(t => (
                <button
                  key={t.id}
                  onClick={() => selectThread(t.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedThread?.id === t.id 
                      ? "bg-primary/5 border-primary" 
                      : "bg-card border-border hover:bg-accent"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold line-clamp-1">{t.subject}</p>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(t.status)}
                      {t.senderId === user?.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteThread(t.id);
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Hapus konsultasi"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {t.replies?.[0]?.message || t.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                </button>
              ))
            ) : (
              <div className="text-center p-8 text-muted-foreground italic text-sm">
                Belum ada konsultasi.
              </div>
            )}
          </div>
        </Card>

        {/* Panel Kanan - Chat Room */}
        <Card className="flex-1 flex flex-col min-h-0 border-border">
          {selectedThread ? (
            <>
              <div className="p-4 border-b border-border bg-muted/30 shrink-0">
                <h3 className="font-bold text-lg tracking-tight">{selectedThread.subject}</h3>
                <p className="text-xs text-muted-foreground">
                  Dibuat pada {new Date(selectedThread.createdAt).toLocaleDateString("id-ID")}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-card">
                {/* Pesan Pertama */}
                <div className={`flex flex-col ${selectedThread.senderId === user?.id ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl ${
                    selectedThread.senderId === user?.id
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted rounded-tl-none border border-border"
                  }`}>
                    <p className="text-sm">{selectedThread.message}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 px-1">
                    {new Date(selectedThread.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                {/* Balasan */}
                {selectedThread.replies?.map((r: any) => (
                  <div key={r.id} className={`flex flex-col ${r.senderId === user?.id ? "items-end" : "items-start"}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl ${
                      r.senderId === user?.id
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted rounded-tl-none border border-border"
                    }`}>
                      <p className="text-sm">{r.message}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 px-1">
                      {new Date(r.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border bg-card shrink-0">
                <form onSubmit={handleReply} className="flex gap-2">
                  <Input
                    placeholder="Tulis balasan..."
                    value={replyMessage}
                    onChange={e => setReplyMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={submitting || !replyMessage.trim()}>
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground p-8">
              <MessageCircle size={48} className="mb-4 opacity-20" />
              <p>Pilih pesan untuk melihat detail percakapan</p>
            </div>
          )}
        </Card>
      </div>

      <Modal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="Konsultasi Baru">
        <form onSubmit={handleCreate} className="space-y-4 p-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Kepada (Guru)</label>
            <SearchableSelect
              value={newForm.receiverId}
              onChange={e => setNewForm({ ...newForm, receiverId: e.target.value })}
              options={[
                { value: "", label: "Pilih Guru..." },
                ...teachers.map(t => ({
                  value: t.userId,
                  label: `${t.name} — ${t.subject} (${t.class}) ${t.phone ? `• ${t.phone}` : ""}`
                }))
              ]}
              placeholder="Pilih Guru..."
              required
            />
          </div>
          <Input
            label="Subjek"
            placeholder="Contoh: Perkembangan belajar di kelas"
            value={newForm.subject}
            onChange={e => setNewForm({ ...newForm, subject: e.target.value })}
            required
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Pesan</label>
            <textarea
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px]"
              placeholder="Tulis pesan Anda..."
              value={newForm.message}
              onChange={e => setNewForm({ ...newForm, message: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsNewModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Mengirim..." : "Kirim Pesan"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
