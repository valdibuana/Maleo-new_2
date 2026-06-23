"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Calendar, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { apiService } from "@/services/apiService";
import { ScheduleSlotCard, ScheduleSlot } from "@/components/schedule/ScheduleSlotCard";
import { ConfirmationBanner } from "@/components/schedule/ConfirmationBanner";
import { TeacherAssignModal } from "@/components/schedule/TeacherAssignModal";

const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
const timeSlots = [
  { label: "Pembiasaan", time: "07:30-08:00" },
  { label: "JP 1", time: "08:00-08:35" },
  { label: "JP 2", time: "08:35-09:10" },
  { label: "JP 3", time: "09:10-09:45" },
  { label: "JP 4", time: "09:45-10:20" },
  { label: "ISTIRAHAT", time: "10:20-10:30" },
  { label: "JP 5", time: "10:30-11:05" },
  { label: "JP 6", time: "11:05-11:40" },
  { label: "ISHOMA", time: "11:40-13:00" },
  { label: "JP 7", time: "13:00-13:35" },
  { label: "JP 8", time: "13:35-14:20" },
];

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState("Senin");
  const [classLevels] = useState([10, 11, 12]);
  
  const [statusData, setStatusData] = useState({
    pendingCount: 0,
    deadline: new Date("2026-07-06T00:00:00Z"),
    pendingTeachers: [] as string[]
  });

  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, teachRes, statusRes] = await Promise.all([
        apiService.getAll("/schedule-slots", { day: activeDay }),
        apiService.getAll("/teachers"),
        apiService.getAll("/schedule-slots/confirmation-status")
      ]);
      setSchedules(schedRes.data || []);
      setTeachers(teachRes.data || []);
      
      if (statusRes.data) {
        setStatusData({
          pendingCount: statusRes.data.pending,
          deadline: new Date("2026-07-06T00:00:00Z"),
          pendingTeachers: statusRes.data.pendingTeachers
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeDay]);

  const handleEditSlot = (slot: ScheduleSlot) => {
    if (slot.slotType === "academic") {
      setSelectedSlot(slot);
      setIsModalOpen(true);
    }
  };

  const handleSaveSlot = async (teacherId: number, isConfirmed: boolean) => {
    if (!selectedSlot) return;
    try {
      await apiService.update("/schedule-slots", selectedSlot.id, {
        teacherId,
        isConfirmed
      });
      await fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || "Gagal menyimpan jadwal");
    }
  };

  const handleRunSeed = async () => {
    if (window.confirm("Jalankan auto-seed jadwal? Ini akan menimpa jadwal yang ada.")) {
      setSeeding(true);
      try {
        await apiService.create("/schedule-slots/bulk-seed", {});
        await fetchData();
      } catch (error) {
        alert("Gagal menjalankan seed.");
      } finally {
        setSeeding(false);
      }
    }
  };

  const getSlot = (classLevel: number, timeSlot: string) => {
    return schedules.find(s => s.classLevel === classLevel && s.timeSlot === timeSlot);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Manajemen Jadwal KBM</h1>
          <p className="text-sm text-slate-600 mt-1">Kelola matriks jadwal pelajaran seluruh kelas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleRunSeed} disabled={seeding}>
            {seeding ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
            Auto-Seed Jadwal
          </Button>
        </div>
      </div>

      <ConfirmationBanner 
        pendingCount={statusData.pendingCount} 
        deadline={statusData.deadline} 
        pendingTeachers={statusData.pendingTeachers} 
      />

      <Card padding={false} className="overflow-hidden border-slate-200">
        <div className="flex border-b border-slate-100 overflow-x-auto hide-scrollbar">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex-1 min-w-[100px] py-4 text-sm font-bold transition-all ${
                activeDay === day 
                  ? "bg-gradient-to-r from-[#4BB8FA] to-[#1591DC] text-white shadow-inner" 
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-sm font-medium">Memuat Matriks Jadwal...</p>
          </div>
        ) : (
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider w-40 shrink-0 border-r border-slate-200 sticky left-0 bg-slate-50 z-10">Waktu</th>
                  {classLevels.map(level => (
                    <th key={level} className="p-4 font-extrabold text-slate-800 text-center border-r border-slate-200 min-w-[280px]">
                      Kelas {level}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timeSlots.map(({ label, time }) => {
                  const isBreak = label === "ISTIRAHAT" || label === "ISHOMA";
                  return (
                    <tr key={time} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 border-r border-slate-200 sticky left-0 bg-white z-10">
                        <div className="font-mono text-sm font-bold text-slate-700">{time}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
                      </td>
                      {classLevels.map(level => {
                        const slot = getSlot(level, time);
                        if (isBreak) {
                          if (level === 10) {
                            return (
                              <td key={level} colSpan={3} className="p-4 bg-slate-50 text-center border-r border-slate-200">
                                <span className="text-sm font-bold text-slate-400 tracking-[0.2em]">{label}</span>
                              </td>
                            );
                          }
                          return null; // Skip rendering cells for other levels since colSpan=3
                        }
                        
                        return (
                          <td key={level} className="p-3 border-r border-slate-200 align-top">
                            {slot ? (
                              <ScheduleSlotCard 
                                slot={slot} 
                                variant="compact" 
                                onEdit={slot.slotType === "academic" ? handleEditSlot : undefined} 
                              />
                            ) : (
                              <div className="h-full min-h-[80px] rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                                <span className="text-xs font-medium opacity-50">Kosong</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <TeacherAssignModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        slot={selectedSlot}
        teachers={teachers}
        onSave={handleSaveSlot}
      />
    </div>
  );
}
