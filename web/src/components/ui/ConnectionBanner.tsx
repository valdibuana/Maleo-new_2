"use client";

import React from "react";
import { WifiOff, RefreshCw, Wifi } from "lucide-react";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

/**
 * Connection status banner shown at top of page.
 * - Yellow banner when offline
 * - Blue sync indicator when re-syncing
 * - Hidden when online and synced
 */
export function ConnectionBanner() {
  const { isOnline, isSyncing } = useOnlineStatus();

  if (isSyncing) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-blue-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
        <RefreshCw size={14} className="animate-spin" />
        <span>Menyinkronkan data...</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
        <WifiOff size={14} />
        <span>
          Koneksi terputus — perubahan akan disimpan dan disinkronkan otomatis
        </span>
      </div>
    );
  }

  return null;
}

/**
 * Small inline indicator for use inside pages/components.
 * Shows a dot with tooltip when offline.
 */
export function ConnectionDot() {
  const { isOnline, isSyncing } = useOnlineStatus();

  if (isSyncing) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-blue-600"
        title="Menyinkronkan..."
      >
        <RefreshCw size={10} className="animate-spin" />
        Sync
      </span>
    );
  }

  if (!isOnline) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-amber-600"
        title="Anda sedang offline"
      >
        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
        Offline
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-600 opacity-50">
      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
    </span>
  );
}
