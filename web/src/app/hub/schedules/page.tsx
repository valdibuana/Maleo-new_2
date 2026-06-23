"use client";

import React, { useState, useEffect } from "react";
import { Loader2, RefreshCcw, CalendarX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { apiService } from "@/services/apiService";
import { ScheduleSlotCard, ScheduleSlot } from "@/components/schedule/ScheduleSlotCard";
import { ConfirmationBanner } from "@/components/schedule/ConfirmationBanner";

export default function HubSchedulesPage() {
  const [schedules, setSchedules] = useState<Record<string, ScheduleSlot[]>>({});
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userTeacherId, setUserTeacherId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Senin");
  
  // Teacher confirmation metrics
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingDeadline, setPendingDeadline] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const storedUser = localStorage.getItem("user");
      let role = null;
      let teacherId: number | null = null;
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        role = parsed.role;
        teacherId = parsed.teacherId ?? null;
        setUserRole(role);
        setUserTeacherId(teacherId);
      }

      if (role === "teacher") {
        // Fetch ALL schedules to show both own and other teachers' schedules
        const res = await apiService.getAll("/schedule-slots", { all: "true" });
        const slots = res.data || [];

        // Group by day
        const grouped: Record<string, ScheduleSlot[]> = {};
        slots.forEach((slot: ScheduleSlot) => {
          if (!grouped[slot.day]) grouped[slot.day] = [];
          grouped[slot.day].push(slot);
        });
        setSchedules(grouped);

        // Calculate pending confirmations for this teacher's slots
        let pending = 0;
        let deadline = null;
        slots.forEach((slot: any) => {
          if (
            slot.slotType === "academic" &&
            !slot.isConfirmed &&
            (slot.teacherId === teacherId || slot.teacher?.id === teacherId)
          ) {
            pending++;
            if (slot.confirmationDeadline) {
              deadline = new Date(slot.confirmationDeadline);
            }
          }
        });
        setPendingCount(pending);
        setPendingDeadline(deadline);
      } else {
        // Student or Guardian
        const res = await apiService.getAll("/schedule-slots");
        const slots = res.data || [];
        const grouped = slots.reduce((acc: any, slot: any) => {
          if (!acc[slot.day]) acc[slot.day] = [];
          acc[slot.day].push(slot);
          return acc;
        }, {});
        setSchedules(grouped);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isTeacher = userRole === "teacher";
  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

  // Helper: check if a schedule slot belongs to the logged-in teacher
  const isOwnSchedule = (slot: ScheduleSlot): boolean => {
    if (!userTeacherId) return false;
    return slot.teacherId === userTeacherId || slot.teacher?.id === userTeacherId;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isTeacher ? "Jadwal Mengajar & Jadwal Sekolah" : "Jadwal Pelajaran Saya"}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {isTeacher 
              ? "Seluruh jadwal sekolah — jadwal Anda ditandai warna hijau" 
              : "Jadwal mata pelajaran kelas Anda selama satu minggu"}
          </p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {isTeacher && pendingCount > 0 && pendingDeadline && (
        <ConfirmationBanner 
          isTeacherView 
          pendingCount={pendingCount} 
          deadline={pendingDeadline} 
          pendingTeachers={[]} 
        />
      )}

      {/* Legend for teacher view */}
      {isTeacher && (
        <div className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-teal-100 border-l-4 border-teal-500"></span>
            <span>Jadwal Mengajar Anda</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-white border border-gray-200"></span>
            <span>Jadwal Guru Lain</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="animate-spin mb-2" />
          <p>Memuat jadwal...</p>
        </div>
      ) : isTeacher ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {days.map((day) => {
            const daySchedules = schedules[day] || [];
            return (
              <Card key={day} className="p-0 overflow-hidden border-t-4 border-t-[#1591DC] shadow-sm flex flex-col h-full bg-slate-50">
                <div className="px-6 py-4 bg-white border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-900 tracking-tight">
                    {day}
                  </h3>
                </div>
                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  {daySchedules.length > 0 ? (
                    daySchedules.map((s) => {
                      const own = isOwnSchedule(s);
                      return (
                        <div
                          key={s.id}
                          className={
                            own
                              ? "rounded-xl border-l-4 border-teal-500 bg-teal-50 p-1 shadow-sm"
                              : "rounded-xl border border-gray-200 bg-white p-1"
                          }
                        >
                          <ScheduleSlotCard slot={s} variant="compact" showClass />
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8">
                      <CalendarX size={32} className="mb-2 opacity-50" />
                      <p className="text-xs font-medium">Kosong</p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card padding={false} className="overflow-hidden border-slate-200 shadow-sm bg-white">
          <div className="flex border-b border-slate-100 overflow-x-auto hide-scrollbar">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setActiveTab(day)}
                className={`flex-1 min-w-[100px] py-4 text-sm font-bold transition-all ${
                  activeTab === day 
                    ? "bg-gradient-to-r from-[#4BB8FA] to-[#1591DC] text-white shadow-inner" 
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <div className="p-6 bg-slate-50 min-h-[400px]">
            <div className="max-w-2xl mx-auto space-y-4">
              {(schedules[activeTab] || []).length > 0 ? (
                schedules[activeTab].map((s) => (
                  <ScheduleSlotCard key={s.id} slot={s} variant="detailed" />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                  <CalendarX size={48} className="mb-4 opacity-50" />
                  <p className="text-sm font-medium">Tidak ada jadwal untuk hari ini</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
