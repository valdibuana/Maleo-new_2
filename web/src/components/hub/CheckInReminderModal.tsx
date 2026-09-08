"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";

export function CheckInReminderModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [checkInInfo, setCheckInInfo] = useState<any>(null);

  useEffect(() => {
    // Check if dismissed in this session
    if (sessionStorage.getItem("checkin_reminder_dismissed") === "true") return;

    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (storedUser.role === "teacher") {
        import("@/services/apiService").then(({ apiService }) => {
          apiService.getAll("/teacher-attendances/today")
            .then((res) => {
              if (res.data) setCheckInInfo(res.data);
            })
            .catch(console.error);
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!checkInInfo) return;
    const { hasCheckedIn, hasScheduleToday, workStartTime } = checkInInfo;

    // Only teachers who haven't checked in, have schedule, and it's past workStartTime need the reminder
    if (hasCheckedIn || !hasScheduleToday) return;

    // Check again in case it was dismissed while fetching
    if (sessionStorage.getItem("checkin_reminder_dismissed") === "true") return;

    const checkTime = () => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      setCurrentTime(timeStr);
      
      if (timeStr >= workStartTime) {
        setIsOpen(true);
      }
    };

    checkTime(); // Check immediately
    const interval = setInterval(checkTime, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkInInfo]);

  const handleDismiss = () => {
    sessionStorage.setItem("checkin_reminder_dismissed", "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDismiss}
      title="Waktunya Check-in!"
      size="md"
    >
      <div className="flex flex-col items-center text-center p-4 space-y-4">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-2">
          <AlertTriangle size={32} />
        </div>
        
        <h3 className="text-lg font-bold text-foreground">Anda Belum Check-in Hari Ini</h3>
        
        <p className="text-sm text-muted-foreground">
          Saat ini pukul <span className="font-bold text-foreground">{currentTime}</span>. Jadwal kerja dimulai pada pukul <span className="font-bold">{checkInInfo?.workStartTime}</span>. Silakan melakukan check-in kehadiran sekarang.
        </p>

        <div className="flex w-full gap-3 mt-6 pt-4 border-t border-border">
          <Button variant="secondary" className="flex-1" onClick={handleDismiss}>
            Nanti Saja
          </Button>
          <Link href="/hub/checkin" className="flex-1" onClick={handleDismiss}>
            <Button className="w-full bg-brand text-white hover:bg-brand/90">
              Check-in Sekarang
            </Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}
