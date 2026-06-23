"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  LogIn,
} from "lucide-react";
import Cookies from "js-cookie";
import Image from "next/image";
import { API_BASE_URL } from "@/lib/api-url";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier || !password) {
      setError("Username / NIS dan password harus diisi");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Email atau password salah.");
      }

      localStorage.setItem("jwt_token", data.data.token);
      localStorage.setItem("refresh_token", data.data.refreshToken);
      const isSecure = process.env.NODE_ENV === "production";
      Cookies.set("jwt_token", data.data.token, {
        expires: 7,
        secure: isSecure,
        sameSite: "strict",
        path: "/",
      });

      const user = data.data.user;
      localStorage.setItem("user", JSON.stringify(user));
      Cookies.set("user_role", user.role, {
        expires: 7,
        secure: isSecure,
        sameSite: "strict",
        path: "/",
      });

      Cookies.set("refresh_token", data.data.refreshToken, {
        expires: 30,
        secure: isSecure,
        sameSite: "strict",
        path: "/",
      });

      if (
        user.force_change_password &&
        user.role !== "admin"
      ) {
        router.push("/force-change-password");
        return;
      }

      if (user.role === "admin") {
        router.push("/dashboard");
      } else if (user.role === "kepala_sekolah") {
        router.push("/principal-dashboard");
      } else if (user.role === "teacher" || user.role === "student") {
        router.push("/hub/dashboard");
      } else if (user.role === "guardian") {
        router.push("/connect/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4 sm:px-6 lg:px-8">

      {/* Login Card Terpusat */}
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 space-y-7 animate-in fade-in duration-300">

        {/* Logo Brand */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-20 w-auto min-w-[80px] relative flex items-center justify-center">
            <Image 
              src="/logo-maleo.jpg" 
              alt="Logo Maleo" 
              width={160}
              height={80}
              className="h-full w-auto object-contain drop-shadow-sm"
              priority
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) {
                  e.currentTarget.nextElementSibling.classList.remove('hidden');
                }
              }}
            />
            {/* Fallback jika logo belum ada di folder public */}
            <div className="hidden h-12 w-12 rounded-xl bg-gradient-to-br from-[#4BB8FA] to-[#1591DC] flex items-center justify-center font-black text-xl text-white shadow-md shadow-[#1591DC]/20">
              M
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Maleo Siakad</h1>
            <p className="text-xs text-slate-400 font-medium">Sistem Informasi Akademik Terpadu</p>
          </div>
        </div>

        {/* Teks Selamat Datang */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Selamat Datang 👋
          </h2>
          <p className="text-sm text-slate-400 font-medium">
            Masuk menggunakan akun portal Anda
          </p>
        </div>

        {/* Kotak Error */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-600 animate-in fade-in slide-in-from-top-1">
            ⚠️ {error}
          </div>
        )}

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Input Username/NIS */}
          <div className="space-y-1.5">
            <label
              htmlFor="identifier"
              className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
            >
              Username / Email / NIS / Kode Login
            </label>
            <input
              id="identifier"
              type="text"
              placeholder="Username, Email, NIS/NIP, atau Kode Login"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm text-slate-800 transition-all placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4BB8FA]/20 focus:border-[#1591DC] focus:bg-white"
              disabled={isLoading}
            />
            <p className="text-xs text-slate-400 mt-1">
              Gunakan Username, Email, NIS/NIP, atau Kode Login Anda
            </p>
          </div>

          {/* Input Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams({ mode: "forgot" });
                  if (identifier) params.set("identifier", identifier);
                  router.push(`/force-change-password?${params.toString()}`);
                }}
                className="text-xs text-[#1591DC] hover:text-[#4BB8FA] font-bold transition-colors"
              >
                Lupa password?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan password Anda"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 pr-12 text-sm text-slate-800 transition-all placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4BB8FA]/20 focus:border-[#1591DC] focus:bg-white"
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Fitur Ingat Perangkat */}
          <div className="flex items-center gap-2 pt-0.5">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#1591DC] focus:ring-[#4BB8FA]/30 cursor-pointer accent-[#1591DC]"
              disabled={isLoading}
            />
            <label
              htmlFor="remember"
              className="text-xs font-semibold text-slate-400 cursor-pointer select-none"
            >
              Ingat saya di perangkat ini
            </label>
          </div>

          {/* Tombol Login Bergradasi Premium */}
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-gradient-to-r from-[#4BB8FA] to-[#1591DC] text-white font-bold text-sm shadow-md shadow-[#1591DC]/15 hover:opacity-95 active:scale-[0.99] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>Memvalidasi Data...</span>
              </>
            ) : (
              <>
                <LogIn size={16} />
                <span>Masuk Ke Portal</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-center min-h-[16px] min-w-[16px] relative">
              <Image 
                src="/logo-esgul.png" 
                alt="UEU" 
                width={64}
                height={16}
                className="h-4 w-auto object-contain grayscale"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">
              Powered by Universitas Esa Unggul
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}