import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, BellOff } from "lucide-react";
import NotificationItem from "./NotificationItem";

interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: "normal" | "important" | "urgent";
  createdAt: string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: Announcement[];
  isLoading?: boolean;
  isError?: boolean;
  userId: number | null;
  onReadUpdate: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  notifications,
  isLoading,
  isError,
  userId,
  onReadUpdate,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      
      // Mark as read when opened
      if (notifications && notifications.length > 0 && userId !== null) {
        const storageKey = `readAnnouncements_${userId}`;
        const currentReadIds = JSON.parse(localStorage.getItem(storageKey) || "[]");
        const newReadIds = Array.from(new Set([...currentReadIds, ...notifications.map((a) => a.id)]));
        localStorage.setItem(storageKey, JSON.stringify(newReadIds));
        onReadUpdate();
      }
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, notifications, onClose, onReadUpdate, userId]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-[350px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in duration-200 origin-top-right"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="font-bold text-slate-900 text-sm tracking-tight">Pengumuman</h3>
        <span className="text-[10px] font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
          Terbaru
        </span>
      </div>

      {/* Content */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Memuat pengumuman...</p>
          </div>
        ) : isError || !notifications || notifications.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <BellOff className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-900 mb-1">Belum ada pengumuman</p>
            <p className="text-xs text-slate-400">Anda akan melihat kabar terbaru di sini.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.slice(0, 5).map((item) => (
              <NotificationItem key={item.id} {...item} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <Link
        href="/announcements"
        className="block px-4 py-3 bg-slate-50 hover:bg-slate-100 text-center transition-colors border-t border-slate-100 group"
        onClick={onClose}
      >
        <span className="text-xs font-bold text-brand flex items-center justify-center gap-2">
          Lihat Semua Pengumuman
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </span>
      </Link>
    </div>
  );
};

export default NotificationDropdown;
