"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ForceChangePasswordModal } from "@/components/modals/ForceChangePasswordModal";
import api from "@/lib/axios";
import { API_BASE_URL } from "@/lib/api-url";

function ForceChangePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(true);

  const isPreview = searchParams.get("preview") === "1";
  const isForgotMode = searchParams.get("mode") === "forgot";
  const identifierParam = searchParams.get("identifier") || "";

  useEffect(() => {
    // Dalam mode forgot, user belum login — jangan redirect ke /login
    if (!isForgotMode) {
      const token = localStorage.getItem("jwt_token");
      if (!token && !isPreview) {
        router.push("/login");
      }
    }
  }, [router, isPreview, isForgotMode]);

  // API call — dilempar ke modal sebagai onSubmit prop
  const handleSubmit = async (oldPassword: string, newPassword: string, identifier?: string) => {
    if (isForgotMode) {
      // Mode forgot: gunakan endpoint publik /api/auth/forgot-password
      const resolvedIdentifier = identifier?.trim() || identifierParam;
      if (!resolvedIdentifier) {
        throw new Error("Email / NIS / NIP / Kode Login wajib diisi");
      }
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: resolvedIdentifier,
          defaultPassword: oldPassword,
          newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Gagal mereset password");
      }
    } else {
      // Mode normal: kirim ke PUT /api/auth/change-password (authenticated)
      await api.put("/auth/change-password", {
        currentPassword: oldPassword,
        newPassword,
      });
      // Jika berhasil, update localStorage supaya tidak trigger force-change lagi
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.force_change_password = false;
        localStorage.setItem("user", JSON.stringify(user));
      }
    }
  };

  const handleSuccess = () => {
    setIsOpen(false);

    if (isForgotMode) {
      // Setelah reset berhasil, kembali ke halaman login
      router.push("/login");
      return;
    }

    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    if (user?.role === "admin") {
      router.push("/dashboard");
      return;
    }
    if (user?.role === "kepala_sekolah") {
      router.push("/principal-dashboard");
      return;
    }
    if (user?.role === "teacher" || user?.role === "student") {
      router.push("/hub/dashboard");
      return;
    }
    if (user?.role === "guardian") {
      router.push("/connect/dashboard");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <ForceChangePasswordModal
        isOpen={isOpen}
        onClose={() => {
          if (isForgotMode) router.push("/login");
        }}
        onSuccess={handleSuccess}
        onSubmit={handleSubmit}
        isForgotMode={isForgotMode}
        defaultIdentifier={identifierParam}
      />
    </div>
  );
}

// Wrapped in Suspense because useSearchParams() requires it
export default function ForceChangePasswordPage() {
  return (
    <Suspense>
      <ForceChangePasswordContent />
    </Suspense>
  );
}
