"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  FileText,
  Plus,
  ChevronRight,
  ChevronDown,
  Video,
  File as FileIcon,
  Trash2,
  Eye,
  Pencil,
  RefreshCcw,
  Loader2,
  AlertCircle,
  ExternalLink,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  CheckCircle2
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { apiService } from "@/services/apiService";
import api from "@/lib/axios";

type SelectionType = 'none' | 'module' | 'session' | 'material';

interface SelectedItem {
  type: SelectionType;
  id: number | null;
  data?: any;
}

export default function MaterialsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>({ type: 'none', id: null });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedModules, setExpandedModules] = useState<number[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<number[]>([]);

  // Modals state
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);

  const [currentModuleId, setCurrentModuleId] = useState<number | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  // --- Student ATP State ---
  const [atpList, setAtpList] = useState<any[]>([]);
  const [selectedATP, setSelectedATP] = useState<any>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [loadingATP, setLoadingATP] = useState(false);
  const [errorATP, setErrorATP] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState("");

  // Form states
  const [moduleForm, setModuleForm] = useState({ title: "", description: "", order: 0 });
  const [sessionForm, setSessionForm] = useState({ title: "", sessionNumber: "", isRepeatable: false, isPublished: true });
  const [materialForm, setMaterialForm] = useState({ 
    title: "", 
    type: "pdf", 
    linkUrl: "",
    file: null as File | null,
    order: 0 
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchFilters = async () => {
      try {
        setLoading(true);
        const isStudentUser = user.role === "student";

        if (isStudentUser) {
          // Siswa: ambil mapel dari kelas mereka + academic years
          const [subsRes, yearsRes] = await Promise.all([
            apiService.getAll("/hub/student-subjects"),
            apiService.getAll("/academic-years")
          ]);

          const subs = subsRes.data || [];
          setSubjects(subs);
          setAcademicYears(yearsRes.data || []);

          // Auto-select jika hanya 1 mapel
          if (subs.length === 1) {
            setSelectedSubject(subs[0].id.toString());
          }

          const activeYear = (yearsRes.data || []).find((y: any) => y.isActive);
          if (activeYear) setSelectedYear(activeYear.id.toString());
          else if (yearsRes.data?.length > 0) setSelectedYear(yearsRes.data[0].id.toString());

        } else {
          // Guru/Guardian: gunakan endpoint LMS
          const [subsRes, classesRes, yearsRes] = await Promise.all([
            apiService.getAll("/lms/subjects"),
            apiService.getAll("/lms/classes"),
            apiService.getAll("/academic-years")
          ]);

          setSubjects(subsRes.data || []);
          setTeacherClasses(classesRes.data || []);
          setAcademicYears(yearsRes.data || []);

          if (subsRes.data?.length === 1) {
            setSelectedSubject(subsRes.data[0].id.toString());
          }
          if (classesRes.data?.length === 1) {
            setSelectedClass(classesRes.data[0].id.toString());
          }

          const activeYear = (yearsRes.data || []).find((y: any) => y.isActive);
          if (activeYear) setSelectedYear(activeYear.id.toString());
          else if (yearsRes.data?.length > 0) setSelectedYear(yearsRes.data[0].id.toString());
        }

      } catch (error: any) {
        console.error("FILTER ERROR:", error?.response?.data || error);
        setError("Gagal memuat filter data. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    };

    fetchFilters();
  }, [user?.id]); // Only refetch if the user ID changes

  const fetchModules = async () => {
    if (!selectedSubject || !selectedYear) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiService.getAll("/lms/modules", {
        subjectId: selectedSubject,
        academicYearId: selectedYear,
        classId: selectedClass || undefined
      });
      setModules(res.data || []);
    } catch (error) {
      console.error(error);
      setError("Gagal memuat modul pembelajaran.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSubject && selectedYear) {
      fetchModules();
    }
  }, [selectedSubject, selectedYear, selectedClass]);

  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isGuardian = user?.role === "guardian";

  const fetchStudentATP = async () => {
    setLoadingATP(true);
    setErrorATP("");
    try {
      const res = await apiService.getAll("/atp/student/my-atp");
      setAtpList(res.data || []);
      
      // Auto-select ATP pertama jika hanya ada 1
      if (res.data?.length === 1) {
        setSelectedATP(res.data[0]);
      }
    } catch (err) {
      setErrorATP("Gagal memuat materi pembelajaran. Silakan coba lagi.");
    } finally {
      setLoadingATP(false);
    }
  };

  useEffect(() => {
    if (isStudent) {
      fetchStudentATP();
    }
  }, [isStudent]);

  const toggleModule = (id: number) => {
    setExpandedModules(prev => prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]);
  };

  const toggleSession = (id: number) => {
    setExpandedSessions(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  const selectItem = (type: SelectionType, id: number | null, data?: any) => {
    setSelectedItem({ type, id, data });
  };

  // Handlers
  const handleAddModule = async () => {
    console.log("DEBUG: Submit Form", { title: moduleForm.title, subjectId: selectedSubject, yearId: selectedYear });
    
    if (!moduleForm.title || !selectedSubject || !selectedYear) {
      alert("Mohon isi judul modul, pilih mata pelajaran, dan semester.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (currentModuleId) {
        await apiService.update("/lms/modules", currentModuleId, {
          ...moduleForm,
          order: Number(moduleForm.order)
        });
      } else {
        await apiService.create("/lms/modules", {
          ...moduleForm,
          subjectId: selectedSubject,
          academicYearId: selectedYear,
          classId: selectedClass || undefined,
          order: Number(moduleForm.order)
        });
      }
      fetchModules();
      setIsModuleModalOpen(false);
      setModuleForm({ title: "", description: "", order: 0 });
      setCurrentModuleId(null);
    } catch (error: any) {
      alert("Gagal menyimpan modul.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditModule = (mod: any) => {
    setModuleForm({ title: mod.title, description: mod.description || "", order: mod.order || 0 });
    setCurrentModuleId(mod.id);
    setIsModuleModalOpen(true);
  };

  const handleDeleteModule = async (id: number) => {
    if (!confirm("Hapus modul ini beserta semua pertemuan dan materinya?")) return;
    try {
      await apiService.remove("/lms/modules", id);
      fetchModules();
      selectItem('none', null);
    } catch (error) {
      alert("Gagal menghapus modul.");
    }
  };

  const handleAddSession = async () => {
    if (!sessionForm.title || !currentModuleId) return;
    setIsSubmitting(true);
    try {
      if (currentSessionId && selectedItem.type === 'session') {
        // This is an edit
        await apiService.update("/lms/sessions", currentSessionId, {
          ...sessionForm,
          sessionNumber: Number(sessionForm.sessionNumber)
        });
      } else {
        await apiService.create("/lms/sessions", {
          ...sessionForm,
          moduleId: currentModuleId,
          sessionNumber: sessionForm.sessionNumber ? Number(sessionForm.sessionNumber) : undefined
        });
      }
      fetchModules();
      setIsSessionModalOpen(false);
      setSessionForm({ title: "", sessionNumber: "", isRepeatable: false, isPublished: true });
      setCurrentSessionId(null);
    } catch (error: any) {
      alert("Gagal menyimpan sesi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSession = (session: any) => {
    setSessionForm({ 
      title: session.title, 
      sessionNumber: session.sessionNumber.toString(), 
      isRepeatable: session.isRepeatable, 
      isPublished: session.isPublished 
    });
    setCurrentSessionId(session.id);
    setIsSessionModalOpen(true);
  };

  const handleDeleteSession = async (id: number) => {
    if (!confirm("Hapus pertemuan ini beserta semua materinya?")) return;
    try {
      await apiService.remove("/lms/sessions", id);
      fetchModules();
      selectItem('none', null);
    } catch (error) {
      alert("Gagal menghapus sesi.");
    }
  };

  const handleAddMaterial = async () => {
    if (!materialForm.title || !currentSessionId) return;
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("sessionId", currentSessionId.toString());
      formData.append("title", materialForm.title);
      formData.append("type", materialForm.type);
      formData.append("order", materialForm.order.toString());

      if (materialForm.type === 'link') {
        formData.append("fileUrl", materialForm.linkUrl);
        // Special case for link: we use the same endpoint but it might need different handling if link doesn't upload a file
        // For simplicity, let's assume the backend handles both if we send a dummy file or just use a different endpoint
        // Actually, our backend uploadMaterialFile expects req.file.
        // Let's adjust backend or handle here.
        // I'll use a direct create for link.
        await apiService.create("/lms/materials/upload-link", {
           sessionId: currentSessionId,
           title: materialForm.title,
           type: 'link',
           fileUrl: materialForm.linkUrl,
           order: materialForm.order
        });
      } else {
        if (!materialForm.file) {
          alert("Pilih file untuk diunggah.");
          setIsSubmitting(false);
          return;
        }
        formData.append("file", materialForm.file);
        // Don't set Content-Type header - let axios/browser handle it with proper boundary
        await api.post("/lms/materials/upload", formData);
      }

      fetchModules();
      setIsMaterialModalOpen(false);
      setMaterialForm({ title: "", type: "pdf", linkUrl: "", file: null, order: 0 });
    } catch (error: any) {
      console.error(error);
      alert("Gagal mengunggah materi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaterial = async (id: number) => {
    if (!confirm("Hapus materi ini?")) return;
    try {
      await apiService.remove("/lms/materials", id);
      fetchModules();
      selectItem('none', null);
    } catch (error) {
      alert("Gagal menghapus materi.");
    }
  };

  const handleAccessMaterial = async (material: any, source: 'lms' | 'atp' = 'lms') => {
    if (isStudent) {
      try {
        const endpoint = source === 'lms' 
          ? `/lms/materials/${material.id}/access`
          : `/atp/student/materials/${material.id}/access`;
        
        await api.post(endpoint);
      } catch (e) {
        console.error(`Failed to track ${source.toUpperCase()} material access:`, e);
        // Silent failure - don't block material access
      }
    }

    const url = material.fileUrl.startsWith('http') 
      ? material.fileUrl 
      : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'}${material.fileUrl}`;
    
    window.open(url, "_blank");
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={20} />;
      case 'pdf': return <FileText size={20} />;
      case 'image': return <ImageIcon size={20} />;
      case 'link': return <LinkIcon size={20} />;
      default: return <FileIcon size={20} />;
    }
  };

  const getMaterialColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-rose-50 text-rose-500';
      case 'pdf': return 'bg-red-50 text-red-500';
      case 'ppt':
      case 'pptx': return 'bg-brand/10 text-brand';
      case 'doc':
      case 'docx': return 'bg-brand/10 text-brand';
      case 'image': return 'bg-brand/10 text-brand';
      case 'link': return 'bg-brand/10 text-brand';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const handleAccessMaterialStudent = async (material: any, source: 'lms' | 'atp' = 'atp') => {
    try {
      const endpoint = source === 'lms' 
        ? `/lms/materials/${material.id}/access`
        : `/atp/student/materials/${material.id}/access`;
      
      await apiService.create(endpoint, {});
    } catch (err) {
      console.error(`Gagal track akses materi ${source.toUpperCase()}:`, err);
      // Silent failure - don't block material access
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';
    const url = material.fileUrl.startsWith('http')
      ? material.fileUrl
      : `${baseUrl}${material.fileUrl}`;

    window.open(url, '_blank');
  };

  if (isStudent) {
    const filteredATPList = filterSubjectId 
      ? atpList.filter(atp => atp.subject.id.toString() === filterSubjectId)
      : atpList;

    return (
      <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Materi Pembelajaran</h1>
            <p className="text-sm text-muted-foreground mt-1">Akses materi pembelajaran sesuai kelas dan mata pelajaran Anda</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-48">
               <SearchableSelect
                 id="filterSubjectId"
                 name="filterSubjectId"
                 placeholder="Semua Mata Pelajaran"
                 options={[
                   { value: "", label: "Semua Mata Pelajaran" },
                   ...Array.from(new Set(atpList.map(r => r.subject.id))).map(id => {
                     const subject = atpList.find(r => r.subject.id === id)?.subject;
                     return { value: subject.id.toString(), label: subject.name };
                   })
                 ]}
                 value={filterSubjectId}
                 onChange={e => {
                   setFilterSubjectId(e.target.value);
                   setSelectedATP(null);
                   setSelectedMeeting(null);
                 }}
               />
             </div>
             <Button variant="secondary" size="sm" onClick={fetchStudentATP} disabled={loadingATP}>
               <RefreshCcw size={16} className={loadingATP ? "animate-spin" : ""} />
             </Button>
          </div>
        </div>

        {errorATP && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={20} className="text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">{errorATP}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={fetchStudentATP}>Coba Lagi</Button>
          </div>
        )}

        {loadingATP ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin mb-2 text-brand" size={40} />
            <p className="text-muted-foreground animate-pulse">Memuat materi...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Panel Kiri: Daftar RPS */}
            <div className="lg:col-span-1">
              <Card className="p-4 h-full min-h-[500px]">
                <h3 className="font-bold text-brand mb-4 flex items-center gap-2 tracking-tight">
                  <BookOpen size={18} className="text-brand" /> Mata Pelajaran
                </h3>
                {filteredATPList.length > 0 ? (
                  <div className="space-y-2">
                    {filteredATPList.map((atp: any) => (
                      <div 
                        key={atp.id} 
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedATP?.id === atp.id 
                            ? "bg-brand/10 border-brand text-brand" 
                            : "bg-white border-brand/20 hover:bg-brand/10/50"
                        }`}
                        onClick={() => {
                          setSelectedATP(atp);
                          setSelectedMeeting(null);
                        }}
                      >
                        <h4 className="font-bold text-sm">{atp.subject.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{atp.class.name} | {atp.teacher.name}</p>
                        <p className="text-xs text-brand mt-1">{atp.meetings?.length || 0} Pertemuan</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">Belum ada materi yang tersedia untuk kelas Anda.</p>
                )}
              </Card>
            </div>

            {/* Panel Tengah: Daftar Meeting */}
            <div className="lg:col-span-1">
              <Card className="p-4 h-full min-h-[500px]">
                <h3 className="font-bold text-brand mb-4 flex items-center gap-2 tracking-tight">
                  <FileText size={18} className="text-brand" /> Pertemuan
                </h3>
                {selectedATP ? (
                  selectedATP.meetings?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedATP.meetings.map((meeting: any) => (
                        <div 
                          key={meeting.id} 
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedMeeting?.id === meeting.id 
                              ? "bg-brand/10 border-brand text-brand" 
                              : "bg-white border-brand/20 hover:bg-brand/10/30"
                          }`}
                          onClick={() => setSelectedMeeting(meeting)}
                        >
                          <div className="flex items-start gap-2">
                            <CheckCircle2 size={16} className="text-brand mt-0.5 shrink-0" />
                            <div>
                              <h4 className="font-bold text-sm">Pertemuan {meeting.meetingNumber}</h4>
                              <p className="text-xs font-medium mt-1 truncate">{meeting.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">{meeting.materials?.length || 0} materi</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-10">Belum ada pertemuan yang dipublish.</p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">Pilih mata pelajaran terlebih dahulu.</p>
                )}
              </Card>
            </div>

            {/* Panel Kanan: Detail Meeting + Materi */}
            <div className="lg:col-span-2">
              <Card className="p-6 h-full min-h-[500px]">
                {selectedMeeting ? (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-brand mb-1 tracking-tight">
                        Pertemuan {selectedMeeting.meetingNumber}: {selectedMeeting.title}
                      </h2>
                      <div className="bg-brand/10/50 p-4 rounded-xl border border-brand/20 mt-4">
                        <h4 className="font-bold text-sm text-brand mb-1">Alur Pembelajaran:</h4>
                        <p className="text-sm text-muted-foreground">{selectedMeeting.learningPath || "Tidak ada deskripsi alur pembelajaran."}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-lg text-brand mb-3 flex items-center gap-2 tracking-tight">
                        <FileIcon size={20} className="text-brand" />
                        Daftar Materi
                      </h3>
                      {selectedMeeting.materials?.length > 0 ? (
                        <div className="space-y-3">
                          {selectedMeeting.materials.map((mat: any) => (
                            <div 
                              key={mat.id}
                              className="flex items-center justify-between p-4 bg-white border border-brand/20 rounded-xl hover:border-brand/20 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${getMaterialColor(mat.type)}`}>
                                  {getMaterialIcon(mat.type)}
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-brand truncate max-w-[200px] sm:max-w-xs">{mat.title}</h4>
                                  <p className="text-[10px] font-bold uppercase text-muted-foreground">{mat.type}</p>
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => handleAccessMaterialStudent(mat)}
                                className="bg-brand hover:bg-brand h-8"
                              >
                                Buka
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 border-2 border-dashed border-teal-50 rounded-xl">
                          <p className="text-sm text-muted-foreground">Belum ada materi di pertemuan ini.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
                      <BookOpen size={32} className="text-brand-light" />
                    </div>
                    <h3 className="text-lg font-bold text-brand mb-2 tracking-tight">Pilih Pertemuan</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Pilih salah satu pertemuan dari panel tengah untuk melihat materi yang tersedia.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Materi Pembelajaran</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isTeacher ? "Kelola modul dan materi pembelajaran Anda" : 
             isStudent ? "Akses materi pembelajaran sesuai mata pelajaran" :
             "Pantau materi pembelajaran anak Anda"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-48">
            <SearchableSelect
              id="selectedSubject"
              name="selectedSubject"
              placeholder="Pilih Mata Pelajaran"
              options={subjects.map(s => ({ value: s.id.toString(), label: s.name }))}
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
            />
          </div>
          <div className="w-48">
            <SearchableSelect
              id="selectedYear"
              name="selectedYear"
              placeholder="Pilih Semester"
              options={academicYears.map(y => ({ value: y.id.toString(), label: `${y.name} - ${y.semester}` }))}
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            />
          </div>
          {isTeacher && (
            <div className="w-48">
              <SearchableSelect
                id="selectedClass"
                name="selectedClass"
                placeholder="Pilih Kelas"
                options={teacherClasses.map(c => ({ value: c.id.toString(), label: c.name }))}
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
              />
            </div>
          )}
          <Button variant="secondary" size="sm" onClick={fetchModules} disabled={loading}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={20} className="text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">{error}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchModules}>Coba Lagi</Button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin mb-2 text-brand" size={40} />
          <p className="text-muted-foreground animate-pulse">Memuat materi...</p>
        </div>
      )}

      {/* Main Content */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Module Tree */}
          <div className="lg:col-span-4">
            <Card className="p-5 sticky top-24 max-h-[calc(100vh-160px)] overflow-y-auto border-brand/20/50 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-brand flex items-center gap-2 tracking-tight">
                  <BookOpen size={18} className="text-brand" />
                  Struktur Modul
                </h2>
                {isTeacher && (
                  <Button size="sm" className="bg-brand hover:bg-brand h-8 w-8 p-0" onClick={() => { setCurrentModuleId(null); setIsModuleModalOpen(true); }}>
                    <Plus size={16} />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {modules.length > 0 ? (
                  modules.map((mod) => (
                    <div key={mod.id} className="border-l-2 border-teal-50 ml-1">
                      {/* Module Item */}
                      <div
                        className={`flex items-center gap-2 p-2 rounded-r-lg cursor-pointer transition-all group relative ${
                          selectedItem.type === 'module' && selectedItem.id === mod.id
                            ? 'bg-brand/10 text-brand border-l-2 border-brand -ml-[2px]'
                            : 'hover:bg-brand/10/50'
                        }`}
                        onClick={() => {
                          selectItem('module', mod.id, mod);
                          toggleModule(mod.id);
                        }}
                      >
                        <div className="text-brand-light">
                          {expandedModules.includes(mod.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                        <span className="text-sm font-semibold truncate flex-1">{mod.title}</span>
                        {!mod.isPublished && isTeacher && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Draft</span>
                        )}
                      </div>

                      {/* Sessions */}
                      {expandedModules.includes(mod.id) && (
                        <div className="ml-4 mt-1 space-y-1">
                          {mod.sessions?.map((session: any) => (
                            <div key={session.id} className="border-l border-brand/20 pl-2">
                              <div
                                className={`flex items-center gap-2 p-1.5 rounded-r-md cursor-pointer transition-all group ${
                                  selectedItem.type === 'session' && selectedItem.id === session.id
                                    ? 'bg-brand/10 text-brand border-l-2 border-brand -ml-[2px]'
                                    : 'hover:bg-brand/10/30'
                                }`}
                                onClick={() => {
                                  selectItem('session', session.id, session);
                                  toggleSession(session.id);
                                }}
                              >
                                <div className="text-brand-light">
                                  {expandedSessions.includes(session.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </div>
                                <span className="text-xs font-medium truncate flex-1">Sesi {session.sessionNumber}: {session.title}</span>
                              </div>

                              {/* Materials */}
                              {expandedSessions.includes(session.id) && (
                                <div className="ml-4 mt-1 space-y-1">
                                  {session.materials?.map((mat: any) => (
                                    <div
                                      key={mat.id}
                                      className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer text-[11px] transition-all ${
                                        selectedItem.type === 'material' && selectedItem.id === mat.id
                                          ? 'bg-brand/10 text-brand font-medium'
                                          : 'text-muted-foreground hover:bg-brand/10/30'
                                      }`}
                                      onClick={() => selectItem('material', mat.id, mat)}
                                    >
                                      {getMaterialIcon(mat.type)}
                                      <span className="truncate flex-1">{mat.title}</span>
                                    </div>
                                  ))}
                                  {session.materials?.length === 0 && (
                                    <p className="text-[10px] text-muted-foreground italic pl-6 py-1">Belum ada materi</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                          {isTeacher && (
                            <button 
                              onClick={() => { setCurrentModuleId(mod.id); setIsSessionModalOpen(true); }}
                              className="flex items-center gap-1.5 text-[10px] text-brand font-medium pl-6 py-2 hover:underline"
                            >
                              <Plus size={12} /> Tambah Pertemuan
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center">
                    <BookOpen size={32} className="mx-auto text-brand-light mb-2" />
                    <p className="text-xs text-muted-foreground italic">Belum ada modul</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Panel: Detail Content */}
          <div className="lg:col-span-8">
            {selectedItem.type === 'none' ? (
              <Card className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 text-center border-dashed border-2 border-brand/20 bg-brand/10/10">
                <div className="h-20 w-20 rounded-full bg-brand/10 flex items-center justify-center mb-6">
                  <BookOpen size={40} className="text-brand-light" />
                </div>
                <h3 className="text-xl font-bold text-brand mb-2 tracking-tight">Pilih Materi Pembelajaran</h3>
                <p className="text-muted-foreground max-w-sm">
                  Pilih salah satu modul atau pertemuan dari panel sebelah kiri untuk melihat rincian materi yang tersedia.
                </p>
              </Card>
            ) : selectedItem.type === 'module' ? (
              <Card className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-brand/10 text-brand text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Modul Pembelajaran</span>
                      {selectedItem.data?.isPublished ? (
                        <span className="bg-brand/10 text-brand text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle2 size={10} /> Terpublikasi</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded">Draft</span>
                      )}
                    </div>
                    <h2 className="text-3xl font-extrabold text-brand tracking-tight font-bold">{selectedItem.data?.title}</h2>
                    <p className="text-brand/70 font-medium mt-1">Mata Pelajaran: {selectedItem.data?.subject?.name}</p>
                  </div>
                  {isTeacher && (
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleEditModule(selectedItem.data)}>
                        <Pencil size={16} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteModule(selectedItem.data.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="bg-brand/10/30 p-5 rounded-2xl border border-brand/20/50">
                  <h4 className="font-bold text-brand mb-2">Deskripsi Modul</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedItem.data?.description || "Tidak ada deskripsi untuk modul ini."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-brand/20 shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground">Total Pertemuan</p>
                    <p className="text-3xl font-black text-brand">{selectedItem.data?.sessions?.length || 0}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-brand/20 shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground">Dibuat Oleh</p>
                    <p className="text-lg font-bold text-brand truncate">{selectedItem.data?.teacher?.name}</p>
                  </div>
                </div>

                {isTeacher && (
                  <div className="pt-4 border-t border-brand/20">
                    <Button onClick={() => { setCurrentModuleId(selectedItem.id); setIsSessionModalOpen(true); }} className="bg-brand hover:bg-brand rounded-xl px-6">
                      <Plus size={18} className="mr-2" /> Tambah Pertemuan Baru
                    </Button>
                  </div>
                )}
              </Card>
            ) : selectedItem.type === 'session' ? (
              <Card className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-brand/10 text-brand text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Sesi Pertemuan {selectedItem.data?.sessionNumber}</span>
                      {selectedItem.data?.isRepeatable && (
                        <span className="bg-brand/10 text-brand text-[10px] font-bold px-2 py-0.5 rounded">Dapat Diulang</span>
                      )}
                    </div>
                    <h2 className="text-3xl font-extrabold text-brand tracking-tight font-bold">{selectedItem.data?.title}</h2>
                  </div>
                  {isTeacher && (
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleEditSession(selectedItem.data)}>
                        <Pencil size={16} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteSession(selectedItem.data.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-brand text-lg flex items-center gap-2 tracking-tight">
                      <FileText size={20} className="text-brand" />
                      Materi Pembelajaran
                    </h3>
                    {isTeacher && (
                      <Button size="sm" variant="secondary" onClick={() => { setCurrentSessionId(selectedItem.id); setIsMaterialModalOpen(true); }} className="text-brand border-brand/20">
                        <Plus size={16} className="mr-1" /> Unggah Materi
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {selectedItem.data?.materials?.length > 0 ? (
                      selectedItem.data.materials.map((mat: any) => (
                        <div 
                          key={mat.id} 
                          className="group flex items-center justify-between p-4 bg-white border border-brand/20 rounded-2xl hover:shadow-md hover:border-brand/20 transition-all cursor-pointer"
                          onClick={() => handleAccessMaterial(mat)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${getMaterialColor(mat.type)}`}>
                              {getMaterialIcon(mat.type)}
                            </div>
                            <div>
                              <h4 className="font-bold text-brand group-hover:text-brand transition-colors">{mat.title}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{mat.type}</span>
                                {isTeacher && mat._count?.access > 0 && (
                                  <span className="text-[10px] text-brand font-medium">Diakses {mat._count.access} kali</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-all">
                              <Eye size={16} />
                            </div>
                            {isTeacher && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(mat.id); }} 
                                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 border-2 border-dashed border-teal-50 rounded-2xl">
                        <FileText size={48} className="mx-auto text-brand-light mb-3" />
                        <p className="text-muted-foreground">Belum ada materi pembelajaran yang diunggah untuk sesi ini.</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-8 space-y-8 animate-in fade-in scale-in-95 duration-300">
                <div className="flex items-center gap-6">
                  <div className={`h-20 w-20 rounded-3xl flex items-center justify-center shadow-lg ${getMaterialColor(selectedItem.data?.type)}`}>
                    {getMaterialIcon(selectedItem.data?.type)}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand mb-1 block">Pratinjau Materi</span>
                    <h2 className="text-3xl font-extrabold text-brand tracking-tight font-bold">{selectedItem.data?.title}</h2>
                  </div>
                </div>

                <div className="p-10 rounded-3xl bg-brand/10/50 border border-brand/20 flex flex-col items-center justify-center text-center">
                  <div className="mb-6">
                    {selectedItem.data?.type === 'video' ? <Video size={64} className="text-brand-light" /> : <FileText size={64} className="text-brand-light" />}
                  </div>
                  <h4 className="text-lg font-bold text-brand mb-1">{selectedItem.data?.title}</h4>
                  <p className="text-sm text-muted-foreground mb-8">Tipe File: {selectedItem.data?.type.toUpperCase()}</p>
                  
                  <div className="flex gap-4">
                    <Button onClick={() => handleAccessMaterial(selectedItem.data)} className="bg-brand hover:bg-brand rounded-xl px-8 h-12 shadow-lg shadow-brand/20">
                      <ExternalLink size={18} className="mr-2" /> Buka Materi
                    </Button>
                    {isTeacher && (
                      <Button variant="danger" onClick={() => handleDeleteMaterial(selectedItem.id as number)} className="rounded-xl px-8 h-12">
                        <Trash2 size={18} className="mr-2" /> Hapus
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Modals Section */}
      {isTeacher && (
        <>
          {/* Modal Modul */}
          <Modal isOpen={isModuleModalOpen} onClose={() => !isSubmitting && setIsModuleModalOpen(false)} title="Tambah Modul Baru">
            <div className="p-6 space-y-5">
              <Input
                id="moduleTitle"
                name="moduleTitle"
                label="Judul Modul"
                placeholder="Contoh: Pengenalan Aljabar"
                value={moduleForm.title}
                onChange={e => setModuleForm({ ...moduleForm, title: e.target.value })}
              />
              <div>
                <label htmlFor="moduleDescription" className="block text-sm font-bold text-brand mb-2">Deskripsi Modul</label>
                <textarea
                  id="moduleDescription"
                  name="moduleDescription"
                  className="w-full rounded-xl border border-brand/20 p-3 text-sm focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                  rows={4}
                  placeholder="Berikan ringkasan materi yang akan dipelajari..."
                  value={moduleForm.description}
                  onChange={e => setModuleForm({ ...moduleForm, description: e.target.value })}
                ></textarea>
              </div>
              <Input
                id="moduleOrder"
                name="moduleOrder"
                label="Urutan"
                type="number"
                value={moduleForm.order}
                onChange={e => setModuleForm({ ...moduleForm, order: Number(e.target.value) })}
              />
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" onClick={() => setIsModuleModalOpen(false)} disabled={isSubmitting} className="rounded-xl">Batal</Button>
                <Button onClick={handleAddModule} disabled={isSubmitting || !moduleForm.title || !selectedSubject || !selectedYear} className="bg-brand hover:bg-brand rounded-xl px-6">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Simpan Modul"}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Modal Pertemuan */}
          <Modal isOpen={isSessionModalOpen} onClose={() => !isSubmitting && setIsSessionModalOpen(false)} title="Tambah Pertemuan">
            <div className="p-6 space-y-5">
              <Input
                id="sessionTitle"
                name="sessionTitle"
                label="Judul Pertemuan"
                placeholder="Contoh: Operasi Hitung Campuran"
                value={sessionForm.title}
                onChange={e => setSessionForm({ ...sessionForm, title: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="sessionNumber"
                  name="sessionNumber"
                  label="Nomor Sesi"
                  type="number"
                  placeholder="Auto"
                  value={sessionForm.sessionNumber}
                  onChange={e => setSessionForm({ ...sessionForm, sessionNumber: e.target.value })}
                />
                <div className="flex flex-col justify-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      id="isRepeatable"
                      name="isRepeatable"
                      type="checkbox"
                      checked={sessionForm.isRepeatable}
                      onChange={e => setSessionForm({ ...sessionForm, isRepeatable: e.target.checked })}
                      className="rounded border-brand/20 text-brand focus:ring-brand"
                    />
                    <span className="text-sm font-medium text-brand group-hover:text-brand">Dapat diulang</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" onClick={() => setIsSessionModalOpen(false)} disabled={isSubmitting} className="rounded-xl">Batal</Button>
                <Button onClick={handleAddSession} disabled={isSubmitting || !sessionForm.title} className="bg-brand hover:bg-brand rounded-xl px-6">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Simpan Sesi"}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Modal Material */}
          <Modal isOpen={isMaterialModalOpen} onClose={() => !isSubmitting && setIsMaterialModalOpen(false)} title="Unggah Materi">
            <div className="p-6 space-y-5">
              <Input
                id="materialTitle"
                name="materialTitle"
                label="Judul Materi"
                placeholder="Contoh: Slide Presentasi Bilangan Bulat"
                value={materialForm.title}
                onChange={e => setMaterialForm({ ...materialForm, title: e.target.value })}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="materialType" className="block text-sm font-bold text-brand mb-2">Tipe Materi</label>
                  <Select
                    id="materialType"
                    name="materialType"
                    options={[
                      { value: "pdf", label: "PDF Document" },
                      { value: "ppt", label: "PowerPoint" },
                      { value: "pptx", label: "PowerPoint (New)" },
                      { value: "doc", label: "Word Document" },
                      { value: "docx", label: "Word Document (New)" },
                      { value: "video", label: "Video (MP4)" },
                      { value: "image", label: "Gambar (JPG/PNG)" },
                      { value: "link", label: "Tautan Eksternal" },
                    ]}
                    value={materialForm.type}
                    onChange={e => setMaterialForm({ ...materialForm, type: e.target.value })}
                  />
                </div>
                <Input
                  id="materialOrder"
                  name="materialOrder"
                  label="Urutan Tampilan"
                  type="number"
                  value={materialForm.order}
                  onChange={e => setMaterialForm({ ...materialForm, order: Number(e.target.value) })}
                />
              </div>

              {materialForm.type === 'link' ? (
                <Input
                  id="linkUrl"
                  name="linkUrl"
                  label="URL Tautan"
                  placeholder="https://example.com/materi-ekstra"
                  value={materialForm.linkUrl}
                  onChange={e => setMaterialForm({ ...materialForm, linkUrl: e.target.value })}
                />
              ) : (
                <div>
                  <label className="block text-sm font-bold text-brand mb-2">File Materi (Maks 20MB)</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-brand/20 border-dashed rounded-2xl bg-brand/10/20 hover:bg-brand/10 transition-colors">
                    <div className="space-y-2 text-center">
                      <Upload size={32} className="mx-auto text-brand-light" />
                      <div className="flex text-sm text-slate-700">
                        <label className="relative cursor-pointer rounded-md font-bold text-brand hover:text-brand focus-within:outline-none">
                          <span>Pilih file</span>
                          <input 
                            id="fileInput"
                            name="fileInput"
                            type="file" 
                            className="sr-only" 
                            onChange={e => setMaterialForm({ ...materialForm, file: e.target.files?.[0] || null })}
                            accept=".pdf,.ppt,.pptx,.doc,.docx,.mp4,.jpg,.jpeg,.png"
                          />
                        </label>
                        <p className="pl-1">atau tarik dan lepas</p>
                      </div>
                      <p className="text-xs text-slate-600">
                        {materialForm.file ? (
                          <span className="text-brand font-bold">{materialForm.file.name}</span>
                        ) : (
                          "PDF, PPT, DOC, Video, atau Gambar"
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" onClick={() => setIsMaterialModalOpen(false)} disabled={isSubmitting} className="rounded-xl">Batal</Button>
                <Button 
                  onClick={handleAddMaterial} 
                  disabled={isSubmitting || !materialForm.title || (materialForm.type === 'link' ? !materialForm.linkUrl : !materialForm.file)} 
                  className="bg-brand hover:bg-brand rounded-xl px-6"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Simpan & Unggah"}
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
