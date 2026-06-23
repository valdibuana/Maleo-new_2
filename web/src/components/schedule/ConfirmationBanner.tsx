import React from "react";
import { AlertTriangle, Clock } from "lucide-react";

interface ConfirmationBannerProps {
  pendingCount: number;
  deadline: Date;
  pendingTeachers: string[];
  onViewDetails?: () => void;
  isTeacherView?: boolean;
}

export function ConfirmationBanner({ pendingCount, deadline, pendingTeachers, onViewDetails, isTeacherView }: ConfirmationBannerProps) {
  if (pendingCount === 0) return null;

  const today = new Date();
  const isPastDeadline = today > deadline;

  if (isTeacherView) {
    return (
      <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${isPastDeadline ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
        <AlertTriangle className="shrink-0 mt-0.5" size={18} />
        <div className="flex-1">
          <p className="text-sm font-bold">
            {isPastDeadline ? "Batas Waktu Terlampaui!" : "Mohon konfirmasi kesediaan mengajar"}
          </p>
          <p className="text-xs mt-1 opacity-90">
            Anda memiliki jadwal mengajar yang belum dikonfirmasi. Batas konfirmasi adalah {deadline.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 ${isPastDeadline ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isPastDeadline ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
          <Clock size={20} />
        </div>
        <div>
          <h3 className="font-bold text-sm tracking-tight">
            {pendingCount} Guru Belum Konfirmasi
          </h3>
          <p className="text-xs opacity-80 flex items-center gap-1 mt-0.5">
            Batas Konfirmasi: {deadline.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            {isPastDeadline && <span className="font-semibold text-red-600 ml-1">(TERLAMPAUI)</span>}
          </p>
        </div>
      </div>
      {onViewDetails && (
        <button 
          onClick={onViewDetails}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${isPastDeadline ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
        >
          Lihat Daftar
        </button>
      )}
    </div>
  );
}
