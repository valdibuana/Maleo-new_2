"use client";

import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Loader2 } from "lucide-react";
import { apiService } from "@/services/apiService";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialRole?: "teacher" | "student" | "guardian" | "admin";
}

export const AddUserModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialRole = "teacher" 
}: AddUserModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    nipNis: "",
    password: "",
    role: initialRole,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiService.create("/users", formData);
      onSuccess();
      onClose();
      // Reset form
      setFormData({ name: "", email: "", nipNis: "", password: "", role: initialRole });
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal membuat akun pengguna");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      title={`Tambah Akun ${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <Input
          label="Nama Lengkap"
          placeholder="Nama sesuai identitas"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <Input
          label="Email (Opsional untuk Siswa/Guru)"
          type="email"
          placeholder="contoh@maleo.sch.id"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />

        <Input
          label="NIS / NIP"
          placeholder="Masukkan NIS (Siswa) atau NIP (Guru)"
          value={formData.nipNis}
          onChange={(e) => setFormData({ ...formData, nipNis: e.target.value })}
        />

        <Input
          label="Password Awal"
          type="password"
          placeholder="Tentukan password sementara"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />

        <Select
          label="Role"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
          options={[
            { value: "teacher", label: "Guru" },
            { value: "student", label: "Siswa" },
            { value: "guardian", label: "Wali Murid" },
            { value: "admin", label: "Admin" },
          ]}
          required
        />

        <div className="pt-4 flex justify-end gap-3 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Batal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              "Buat Akun"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
