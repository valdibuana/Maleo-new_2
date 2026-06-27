"use client";
import React, { useState, useEffect } from "react";
import { apiService } from "@/services/apiService";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ClipboardCheck } from "lucide-react";

export default function TeacherAttendancesPage() {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role);
    fetchAttendances();
  }, [selectedMonth, selectedYear]);

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAll("/teacher-attendances", {
        month: selectedMonth,
        year: selectedYear,
      });
      setAttendances(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("jwt_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/teacher-attendances/export?month=${selectedMonth}&year=${selectedYear}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error("Gagal export data");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Rekap_Kehadiran_Guru_${selectedYear}_${selectedMonth}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Gagal export data kehadiran guru.");
    }
  };


  const months = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kehadiran Guru</h1>
          <p className="text-muted-foreground">Monitoring kehadiran dan keterlambatan guru</p>
        </div>
        <Button onClick={handleExport} className="bg-brand hover:bg-brand text-white">
          Export Excel
        </Button>
      </div>

      <Card padding={false}>
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle>Data Kehadiran</CardTitle>
          <div className="flex gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="flex h-9 rounded-lg border border-input bg-card px-3 text-sm"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="flex h-9 rounded-lg border border-input bg-card px-3 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3">No</th>
                    <th className="p-3">Nama Guru</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Jam Masuk</th>
                    <th className="p-3">Keterangan</th>
                    <th className="p-3">Tipe Input</th>
                  </tr>
                </thead>
                <tbody>
                  {attendances.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <ClipboardCheck size={32} className="opacity-30" />
                          <p className="font-medium">Belum ada data kehadiran</p>
                          <p className="text-sm">
                            Guru belum melakukan check-in di bulan{" "}
                            {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    attendances.map((a, i) => (
                      <tr key={a.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">{i + 1}</td>
                        <td className="p-3 font-medium">{a.teacher.name}</td>
                        <td className="p-3">{new Date(a.date).toLocaleDateString('id-ID')}</td>
                        <td className="p-3">
                          <Badge
                            className={
                              a.status === 'hadir' ? 'bg-brand/100 hover:bg-brand' :
                              a.status === 'terlambat' ? 'bg-brand/100 hover:bg-brand' :
                              a.status === 'izin' ? 'bg-brand/100 hover:bg-brand' :
                              a.status === 'sakit' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' :
                              'bg-rose-500 hover:bg-rose-600'
                            }
                          >
                            {a.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {a.checkinAt ? new Date(a.checkinAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          {a.isLate && <span className="ml-2 text-brand text-xs">(Terlambat {a.lateMinutes}m)</span>}
                        </td>
                        <td className="p-3">{a.note || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.checkinType === 'self' ? 'bg-slate-100 text-slate-700' : 'bg-brand/10 text-brand'}`}>
                            {a.checkinType === 'self' ? 'Mandiri' : 'Override'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
