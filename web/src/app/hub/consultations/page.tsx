"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiService } from "@/services/apiService";
import { MessageCircle, Send, Loader2 } from "lucide-react";

export default function HubConsultationsPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(u);
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      const res = await apiService.getAll("/hub/consultations");
      setThreads(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectThread = async (id: number) => {
    try {
      const res = await apiService.getById("/hub/consultations", id);
      setSelectedThread(res.data);
      fetchThreads(); // refresh list to update read status
    } catch (e) {
      console.error(e);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedThread) return;
    setSubmitting(true);
    try {
      await apiService.create(`/hub/consultations/${selectedThread.id}/reply`, {
        message: replyMessage
      });
      setReplyMessage("");
      selectThread(selectedThread.id); // refresh thread
    } catch (e: any) {
      alert("Gagal membalas.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unread": return <Badge variant="danger">Pesan Baru</Badge>;
      case "read": return <Badge variant="neutral">Sudah Dibaca</Badge>;
      case "replied": return <Badge variant="success">Dibalas</Badge>;
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
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Konsultasi Wali Murid</h1>
          <p className="text-muted-foreground mt-1">Kelola pesan dan komunikasi dari wali murid.</p>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <Card className="w-1/3 flex flex-col min-h-0 border-border">
          <div className="p-4 border-b border-border bg-muted/30">
            <h3 className="font-bold tracking-tight">Kotak Masuk</h3>
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
                    {getStatusBadge(t.status)}
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
                Tidak ada pesan masuk.
              </div>
            )}
          </div>
        </Card>

        <Card className="flex-1 flex flex-col min-h-0 border-border">
          {selectedThread ? (
            <>
              <div className="p-4 border-b border-border bg-muted/30 shrink-0">
                <h3 className="font-bold text-lg tracking-tight">{selectedThread.subject}</h3>
                <p className="text-xs text-muted-foreground">
                  Diterima pada {new Date(selectedThread.createdAt).toLocaleDateString("id-ID")}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-card">
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
                    placeholder="Ketik balasan untuk wali murid..."
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
              <p>Pilih pesan untuk mulai membalas</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
