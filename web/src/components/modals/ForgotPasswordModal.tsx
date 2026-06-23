"use client";

import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Loader2 } from "lucide-react";
import api from "@/lib/axios";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  defaultIdentifier?: string;
  onClose: () => void;
}

export const ForgotPasswordModal = ({ isOpen, defaultIdentifier = "", onClose }: ForgotPasswordModalProps) => {
  const [identifier, setIdentifier] = useState(defaultIdentifier);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      // Existing flow: call API to trigger password reset email or show instructions
      await api.post('/auth/forgot-password', { identifier });
      setMessage('Jika akun ditemukan, instruksi reset password telah dikirim ke email terkait.');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal memproses permintaan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lupa Password" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">Masukkan Email / NIS / NIP Anda untuk menerima instruksi reset password.</p>

        {message && <div className="p-3 text-sm bg-green-50 text-emerald-700 border border-emerald-200 rounded">{message}</div>}
        {error && <div className="p-3 text-sm bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>}

        <Input label="Email / NIS / NIP" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />

        <div className="pt-4 flex justify-end gap-3 border-t">
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Memproses...</> : 'Kirim Instruksi'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
