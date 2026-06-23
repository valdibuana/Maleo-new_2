"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, LogOut, ChevronDown, User, Settings } from "lucide-react";
import { Avatar } from "./Avatar";
import { NotificationBell } from "../notifications/NotificationBell";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { cn } from "@/lib/utils";

export function Topbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Ambil data user dari localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }

    // 2. Klik di luar dropdown untuk menutup
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (window.confirm("Apakah Anda yakin ingin keluar?")) {
      // 3. Hapus semua kredensial
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      Cookies.remove("jwt_token");
      Cookies.remove("refresh_token");
      Cookies.remove("user_role");
      
      // 4. Redirect ke login
      router.push("/login");
    }
  };

  // Helper untuk format role
  const formatRole = (role: string) => {
    switch (role) {
      case "admin": return "Administrator";
      case "kepala_sekolah": return "Kepala Sekolah";
      case "teacher": return "Guru";
      case "student": return "Siswa";
      case "guardian": return "Wali Murid";
      default: return role;
    }
  };

  // Nama Pendek (Maks 2 kata)
  const getShortName = (name: string) => {
    if (!name) return "";
    const parts = name.split(" ");
    return parts.length > 2 ? `${parts[0]} ${parts[1]}` : name;
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-6">
      <div className="flex items-center gap-2">
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <NotificationBell />

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={cn(
              "flex items-center gap-3 pl-4 border-l border-border transition-all duration-200 hover:opacity-80",
              isDropdownOpen ? "opacity-70" : ""
            )}
          >
            <Avatar name={user?.name || "User"} size="sm" className="ring-2 ring-brand/20" />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-foreground leading-tight">
                {getShortName(user?.name || "Loading...")}
              </p>
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground leading-tight mt-0.5">
                {formatRole(user?.role || "...")}
              </p>
            </div>
            <ChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200", isDropdownOpen ? "rotate-180" : "")} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-xl shadow-brand/10 py-1.5 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-3 border-b border-border mb-1">
                <p className="text-xs text-muted-foreground">Masuk sebagai</p>
                <p className="text-sm font-bold text-foreground truncate">{user?.name}</p>
              </div>
              
              {user?.role !== "admin" && (
                <button 
                  onClick={() => {
                    setIsDropdownOpen(false);
                    router.push("/settings/profile");
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <User size={16} className="text-muted-foreground" />
                  Profil Saya
                </button>
              )}
              <button className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors">
                <Settings size={16} className="text-muted-foreground" />
                Pengaturan
              </button>
              
              <div className="h-px bg-border my-1" />
              
              <button 
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors font-medium"
              >
                <LogOut size={16} />
                Keluar Aplikasi
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
