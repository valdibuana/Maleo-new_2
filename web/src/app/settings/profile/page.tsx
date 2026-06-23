"use client";

import React, { useState, useEffect } from "react";
import { User, Mail, Lock, Loader2, Save, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [originalData, setOriginalData] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/profile");
      const { name, email } = res.data.data;
      setFormData({ name: name || "", email: email || "", password: "" });
      setOriginalData({ name: name || "", email: email || "" });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal memuat profil");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const payload: any = {};
      if (formData.name !== originalData.name) payload.name = formData.name;
      if (formData.email !== originalData.email) payload.email = formData.email;
      if (formData.password) payload.password = formData.password;

      if (Object.keys(payload).length === 0) {
        toast.error("Tidak ada perubahan yang disimpan");
        return;
      }

      const res = await api.put("/profile", payload);
      toast.success(res.data.message || "Profil berhasil diperbarui");
      
      // Update local storage user data
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        user.name = res.data.data.name;
        user.email = res.data.data.email;
        localStorage.setItem("user", JSON.stringify(user));
      }

      setFormData((prev) => ({ ...prev, password: "" }));
      setOriginalData({ name: res.data.data.name, email: res.data.data.email });
      
      // Refresh to update header/sidebar immediately
      router.refresh();
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal memperbarui profil");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pengaturan Profil</h1>
        <p className="text-sm text-slate-500 mt-1">
          Kelola informasi profil dan kredensial akun Anda.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-brand focus:border-brand sm:text-sm"
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-brand focus:border-brand sm:text-sm"
                  placeholder="Masukkan email aktif"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password Baru
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Kosongkan jika Anda tidak ingin mengubah password.
              </p>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-brand focus:border-brand sm:text-sm"
                  placeholder="Masukkan password baru"
                  minLength={8}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm text-brand bg-brand/10 px-3 py-2 rounded-lg">
              <AlertCircle size={16} />
              <span>Perubahan akan otomatis tersinkronisasi.</span>
            </div>
            
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand hover:bg-brand focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
