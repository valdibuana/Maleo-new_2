"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, Download, Upload, Globe, Lock, PlusCircle, Trash2, X, FileSpreadsheet, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { apiService } from "@/services/apiService";
import { getApiBaseUrl } from "@/lib/api-url";
import { cn } from "@/lib/utils";
import { ScheduleSlotCard, ScheduleSlot as BaseScheduleSlot } from "@/components/schedule/ScheduleSlotCard";
import { TeacherAssignModal } from "@/components/schedule/TeacherAssignModal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

interface ScheduleSlot extends BaseScheduleSlot {
  isPublished?: boolean;
}

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
  const [classLevels] = useState([7, 8, 9, 10, 11, 12]);
  
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importLevel, setImportLevel] = useState<number>(7);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addForm, setAddForm] = useState({
    classLevel: 7,
    day: "Senin",
    timeSlot: "08:00-08:35",
    slotType: "academic",
    subjectName: "",
    teacherName: "",
    teacherId: "",
  });

  const [isExcelDropdownOpen, setIsExcelDropdownOpen] = useState(false);
  const excelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (excelDropdownRef.current && !excelDropdownRef.current.contains(event.target as Node)) {
        setIsExcelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, teachRes] = await Promise.all([
        apiService.getAll("/schedule-slots", { day: activeDay }),
        apiService.getAll("/teachers")
      ]);
      setSchedules(schedRes.data || []);
      setTeachers(teachRes.data || []);
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

  const handleDownloadTemplate = () => {
    const apiUrl = getApiBaseUrl();
    window.open(`${apiUrl}/schedule-slots/template`, "_blank");
  };

  const handleExport = (level: number) => {
    const apiUrl = getApiBaseUrl();
    window.open(`${apiUrl}/schedule-slots/export?classLevel=${level}`, "_blank");
  };

  const handleImport = async () => {
    if (!importFile) return alert("Pilih file excel terlebih dahulu");
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("excel", importFile);
      fd.append("classLevel", importLevel.toString());
      
      const apiUrl = getApiBaseUrl();
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`${apiUrl}/schedule-slots/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (data.success) {
        alert("Berhasil import jadwal!");
        setIsImportOpen(false);
        setImportFile(null);
        fetchData();
      } else {
        alert(data.message || "Gagal import");
      }
    } catch (e) {
      alert("Terjadi kesalahan saat upload.");
    } finally {
      setImporting(false);
    }
  };

  const handlePublish = async (level: number, currentStatus: boolean) => {
    if (!window.confirm(`Apakah Anda yakin ingin ${currentStatus ? 'MENARIK' : 'MEMPUBLISH'} jadwal untuk Kelas ${level}?`)) return;
    try {
      await apiService.update("/schedule-slots", "publish", {
        classLevel: level,
        isPublished: !currentStatus
      });
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.message || "Gagal update status publish");
    }
  };

  const handleAddSlot = async () => {
    if (!addForm.subjectName && addForm.slotType === "academic") {
      return alert("Nama mata pelajaran wajib diisi untuk slot akademik.");
    }
    setAddSaving(true);
    try {
      await apiService.create("/schedule-slots", {
        classLevel: addForm.classLevel,
        day: addForm.day,
        timeSlot: addForm.timeSlot,
        jpLabel: addForm.timeSlot,
        slotType: addForm.slotType,
        subjectName: addForm.subjectName || null,
        teacherName: addForm.teacherName || null,
        teacherId: addForm.teacherId ? Number(addForm.teacherId) : null,
      });
      alert("Slot jadwal berhasil ditambahkan!");
      setIsAddOpen(false);
      setAddForm({ classLevel: 7, day: "Senin", timeSlot: "08:00-08:35", slotType: "academic", subjectName: "", teacherName: "", teacherId: "" });
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.message || "Gagal menambahkan slot jadwal.");
    } finally {
      setAddSaving(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!window.confirm("Hapus slot jadwal ini?")) return;
    try {
      await apiService.remove("/schedule-slots", slotId);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.message || "Gagal menghapus slot.");
    }
  };

  const getSlot = (classLevel: number, timeSlot: string) => {
    // Cari dengan exact match dulu, lalu fallback dengan replace dots↔colons
    // untuk toleransi mismatch format dari import Excel yang mungkin pakai titik
    return schedules.find(s => 
      s.classLevel === classLevel && (
        s.timeSlot === timeSlot || 
        s.timeSlot === timeSlot.replace(/:/g, '.') ||
        s.timeSlot === timeSlot.replace(/\./g, ':')
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Manajemen Jadwal KBM</h1>
          <p className="text-sm text-slate-600 mt-1">Kelola matriks jadwal pelajaran seluruh kelas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => setIsAddOpen(true)}>
            <PlusCircle size={16} className="mr-2" />
            Tambah Manual
          </Button>
          <div className="relative" ref={excelDropdownRef}>
            <Button 
              variant="outline" 
              onClick={() => setIsExcelDropdownOpen(!isExcelDropdownOpen)}
              className="gap-1 bg-[#39FF14] hover:bg-[#32E013] text-slate-900 border-[#39FF14] font-bold"
            >
              <FileSpreadsheet size={18} className="mr-1.5" />
              Excel
              <ChevronDown size={16} className={cn("transition-transform duration-200", isExcelDropdownOpen && "rotate-180")} />
            </Button>
            {isExcelDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white shadow-xl z-20 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                <div className="p-1">
                  <button
                    onClick={() => {
                      handleDownloadTemplate();
                      setIsExcelDropdownOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <Download size={15} className="text-slate-500" />
                    Template Excel
                  </button>
                  <button
                    onClick={() => {
                      setIsImportOpen(true);
                      setIsExcelDropdownOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    <Upload size={15} className="text-emerald-600" />
                    Import Jadwal
                  </button>
                  <button
                    onClick={() => {
                      const level = prompt("Masukkan tingkat kelas untuk export (7-12):", "10");
                      if (level) handleExport(Number(level));
                      setIsExcelDropdownOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <FileSpreadsheet size={15} className="text-blue-600" />
                    Export Excel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
                  {classLevels.map(level => {
                    const isPub = schedules.find(s => s.classLevel === level)?.isPublished || false;
                    return (
                    <th key={level} className="p-4 font-extrabold text-slate-800 text-center border-r border-slate-200 min-w-[280px]">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <span>Kelas {level}</span>
                        <Button 
                          size="sm" 
                          variant={isPub ? "outline" : "primary"}
                          onClick={() => handlePublish(level, isPub)}
                          className={`h-7 text-xs px-3 ${isPub ? "text-slate-600" : "bg-blue-600 hover:bg-blue-700"}`}
                        >
                          {isPub ? <><Lock size={12} className="mr-1.5"/> Tarik Draft</> : <><Globe size={12} className="mr-1.5"/> Publish</>}
                        </Button>
                      </div>
                    </th>
                  )})}
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
                              <div className="relative">
                                <ScheduleSlotCard 
                                  slot={slot} 
                                  variant="compact" 
                                  onEdit={slot.slotType === "academic" ? handleEditSlot : undefined} 
                                />
                                <button
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="absolute top-1.5 right-1.5 opacity-40 hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-lg p-1.5 shadow-sm"
                                  title="Hapus slot ini"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
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

      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Import Jadwal KBM</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tingkat Kelas</label>
                <select 
                  className="w-full border-slate-200 rounded-lg p-2 border"
                  value={importLevel}
                  onChange={(e) => setImportLevel(Number(e.target.value))}
                >
                  {classLevels.map(l => <option key={l} value={l}>Kelas {l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">File Excel (.xlsx)</label>
                <input 
                  type="file" 
                  accept=".xlsx, .xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsImportOpen(false)}>Batal</Button>
              <Button onClick={handleImport} disabled={importing || !importFile}>
                {importing ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Import Jadwal
              </Button>
            </div>
          </div>
        </div>
      )}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Tambah Slot Jadwal Manual</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tingkat Kelas</label>
                <select className="w-full border rounded-lg p-2 text-sm" value={addForm.classLevel} onChange={e => setAddForm(f => ({...f, classLevel: Number(e.target.value)}))}>
                  {classLevels.map(l => <option key={l} value={l}>Kelas {l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Hari</label>
                <select className="w-full border rounded-lg p-2 text-sm" value={addForm.day} onChange={e => setAddForm(f => ({...f, day: e.target.value}))}>
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Jam Pelajaran</label>
                <select className="w-full border rounded-lg p-2 text-sm" value={addForm.timeSlot} onChange={e => setAddForm(f => ({...f, timeSlot: e.target.value}))}>
                  {timeSlots.filter(ts => ts.label !== "ISTIRAHAT" && ts.label !== "ISHOMA").map(ts => (
                    <option key={ts.time} value={ts.time}>{ts.label} ({ts.time})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipe Slot</label>
                <select className="w-full border rounded-lg p-2 text-sm" value={addForm.slotType} onChange={e => setAddForm(f => ({...f, slotType: e.target.value}))}>
                  <option value="academic">Akademik (Mapel)</option>
                  <option value="non_academic">Non-Akademik (Kegiatan)</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {addForm.slotType === "academic" ? "Nama Mata Pelajaran *" : "Nama Kegiatan"}
                </label>
                <input
                  className="w-full border rounded-lg p-2 text-sm"
                  placeholder={addForm.slotType === "academic" ? "contoh: Matematika" : "contoh: Upacara Bendera"}
                  value={addForm.subjectName}
                  onChange={e => setAddForm(f => ({...f, subjectName: e.target.value}))}
                />
              </div>
              <div>
                <SearchableSelect 
                  label="Guru Pengampu"
                  options={[
                    { value: "", label: "-- Pilih Guru (opsional) --" },
                    ...teachers.map((t: any) => ({ value: t.id, label: t.name }))
                  ]}
                  value={addForm.teacherId} 
                  onChange={e => {
                    const t = teachers.find((t: any) => t.id === Number(e.target.value));
                    setAddForm(f => ({...f, teacherId: e.target.value, teacherName: t?.name || ""}));
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Atau Ketik Nama Guru</label>
                <input
                  className="w-full border rounded-lg p-2 text-sm"
                  placeholder="Nama guru jika belum terdaftar"
                  value={addForm.teacherName}
                  onChange={e => setAddForm(f => ({...f, teacherName: e.target.value, teacherId: ""}))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
              <Button onClick={handleAddSlot} disabled={addSaving}>
                {addSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : <PlusCircle size={16} className="mr-2" />}
                Simpan Slot
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
