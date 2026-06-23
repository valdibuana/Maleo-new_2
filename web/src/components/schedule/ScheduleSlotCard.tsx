import React from "react";
import { Clock, MapPin, User, AlertCircle, Sparkles, Coffee } from "lucide-react";

export interface ScheduleSlot {
  id: number;
  classLevel: number;
  day: string;
  timeSlot: string;
  jpLabel: string;
  slotType: "academic" | "pembiasaan" | "istirahat" | "ishoma" | "special";
  subjectName: string | null;
  teacherName: string | null;
  teacherId: number | null;
  isConfirmed: boolean;
  confirmationDeadline: string | null;
  teacher?: { id: number; name: string };
}

interface ScheduleSlotCardProps {
  slot: ScheduleSlot;
  variant: "compact" | "detailed";
  showClass?: boolean;
  onEdit?: (slot: ScheduleSlot) => void;
}

export function ScheduleSlotCard({ slot, variant, showClass, onEdit }: ScheduleSlotCardProps) {
  const isDetailed = variant === "detailed";

  if (slot.slotType === "istirahat" || slot.slotType === "ishoma") {
    return (
      <div className="p-3 bg-slate-100 text-slate-400 italic text-center rounded-xl border border-dashed border-slate-200">
        <div className="flex items-center justify-center gap-2">
          <Coffee size={16} />
          <span className="font-medium text-sm">{slot.timeSlot} - {slot.jpLabel}</span>
        </div>
      </div>
    );
  }

  if (slot.slotType === "pembiasaan") {
    return (
      <div className="p-4 bg-sky-50 border-l-4 border-l-sky-300 rounded-r-xl italic transition-all">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">{slot.timeSlot} - {slot.jpLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-sky-500" />
          <span className="font-semibold text-sky-900 text-sm">{slot.subjectName}</span>
        </div>
      </div>
    );
  }

  if (slot.slotType === "special") {
    return (
      <div className="p-4 bg-amber-50 border-l-4 border-l-amber-400 rounded-r-xl transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{slot.timeSlot} - {slot.jpLabel}</span>
          <span className="text-[10px] font-bold text-amber-700 px-2 py-0.5 bg-amber-200/50 rounded uppercase">Khusus</span>
        </div>
        <h4 className="font-bold text-sm text-amber-950 mb-1">{slot.subjectName}</h4>
        {slot.teacherName && (
          <div className="flex items-center gap-2 text-xs text-amber-700/80">
            <User size={12} />
            <span className="truncate">{slot.teacherName}</span>
          </div>
        )}
      </div>
    );
  }

  // Academic slot
  return (
    <div 
      className={`p-4 bg-white border-l-4 border-l-[#1591DC] shadow-sm rounded-r-xl transition-all ${onEdit ? 'cursor-pointer hover:shadow-md' : ''}`}
      onClick={() => onEdit && onEdit(slot)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-brand uppercase tracking-widest">{slot.timeSlot} - {slot.jpLabel}</span>
        {showClass && (
          <span className="text-[10px] font-bold text-slate-600 px-2 py-0.5 bg-slate-100 rounded uppercase">
            Kelas {slot.classLevel}
          </span>
        )}
      </div>
      <h4 className="font-extrabold tracking-tight text-slate-900 text-sm mb-2">{slot.subjectName}</h4>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <User size={12} className="text-slate-400" />
          {slot.teacherName ? (
            <span className={`truncate font-medium ${slot.isConfirmed ? 'text-slate-700' : 'text-amber-600'}`}>
              {slot.teacherName} {!slot.isConfirmed && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded">Menunggu Konfirmasi</span>}
            </span>
          ) : (
            <span className="text-amber-600 text-[10px] font-bold bg-amber-100 px-2 py-0.5 rounded uppercase">
              Belum Ada Guru
            </span>
          )}
        </div>
        {isDetailed && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MapPin size={12} />
            <span>R. {slot.classLevel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
