"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { performLogout } from "@/lib/axios";
import { cn } from "@/lib/utils";
import Cookies from "js-cookie";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Award,
  ClipboardCheck,
  Clock,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  UserCircle,
  UserCheck,
  MessageCircle,
  BarChart3,
  LogOut,
} from "lucide-react";

// Menu khusus Guru — ATP & absensi, konsultasi wali
const menuItemsTeacher = [
  {
    label: "Menu Utama",
    items: [
      { name: "Dashboard", href: "/hub/dashboard", icon: LayoutDashboard },
      { name: "Absensi Guru", href: "/hub/checkin", icon: UserCheck },
      { name: "Absensi Siswa", href: "/hub/absensi/input", icon: PlusCircle },
    ],
  },
  {
    label: "Pembelajaran",
    items: [
      { name: "Modul Pembelajaran (ATP)", href: "/hub/atp", icon: BookOpen },
      { name: "Tugas", href: "/hub/assignments", icon: ClipboardList },
      { name: "Nilai Siswa", href: "/hub/grades", icon: Award },
    ],
  },
  {
    label: "Informasi",
    items: [
      { name: "Konsultasi Wali", href: "/hub/consultations", icon: MessageCircle },
      { name: "Pengumuman", href: "/hub/announcements", icon: Megaphone },
      { name: "Profil Saya", href: "/settings/profile", icon: UserCircle },
    ],
  },
];

// Menu khusus Siswa — RPS DIHAPUS (internal guru only)
const menuItemsStudent = [
  {
    label: "Menu Utama",
    items: [
      { name: "Dashboard", href: "/hub/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Pembelajaran",
    items: [
      { name: "Materi", href: "/hub/materials", icon: BookOpen },
      { name: "Tugas", href: "/hub/assignments", icon: ClipboardList },
    ],
  },
  {
    label: "Akademik",
    items: [
      { name: "Nilai", href: "/hub/grades", icon: Award },
      { name: "Kehadiran", href: "/hub/attendance", icon: ClipboardCheck },
      { name: "Jadwal", href: "/hub/schedules", icon: Clock },
      { name: "Analisis Minat Belajar", href: "/hub/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Informasi",
    items: [
      { name: "Pengumuman", href: "/hub/announcements", icon: Megaphone },
      { name: "Profil Saya", href: "/settings/profile", icon: UserCircle },
    ],
  },
];

export function HubSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUserRole(parsed.role);
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }
  }, []);

  const handleLogout = () => {
    if (window.confirm("Apakah Anda yakin ingin keluar?")) {
      performLogout();
      router.push("/login");
    }
  };

  // HubSidebar hanya untuk teacher dan student
  // Guardian → /connect, Kepala Sekolah & Admin → /principal-dashboard atau /dashboard
  const getMenuItems = () => {
    switch (userRole) {
      case "teacher":
        return menuItemsTeacher;
      case "student":
      default:
        return menuItemsStudent;
    }
  };

  const menuItems = getMenuItems();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 flex flex-col",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-light to-brand flex items-center justify-center font-bold text-sm shrink-0 shadow-lg shadow-brand/30">
            M
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-base leading-tight truncate tracking-tight">Maleo Hub</h1>
              <p className="text-[10px] text-brand-light leading-tight">Portal Guru & Siswa</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {menuItems.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">{group.label}</p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-brand text-white shadow-md shadow-brand/30"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon size={20} className={cn("shrink-0", isActive ? "text-white" : "text-slate-400")} />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3 space-y-1 shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center w-full gap-3 rounded-lg px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Ciutkan</span>}
        </button>
      </div>
    </aside>
  );
}
