"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  Upload,
  Link as LinkIcon,
  Trash2,
  CheckCircle,
  ExternalLink,
  Plus,
  Edit,
  Globe,
  File as FileIcon,
  Video,
  ImageIcon,
  Eye,
  Loader2,
  RefreshCw,
  Sparkles,
  Info
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { apiService } from "@/services/apiService";
import api from "@/lib/axios";
import toast from "react-hot-toast";

export default function AtpDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [rps, setRps] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Accordion expanded meetings state
  const [expandedMeetings, setExpandedMeetings] = useState<number[]>([]);

  // Modals state
  const [isEditAtpModalOpen, setIsEditAtpModalOpen] = useState(false);
  const [isEditMeetingModalOpen, setIsEditMeetingModalOpen] = useState(false);
  const [isUploadMaterialModalOpen, setIsUploadMaterialModalOpen] = useState(false);

  // Forms state
  const [atpForm, setAtpForm] = useState({
    learningObjective: "",
    learningStrategy: "",
    teacherNote: ""
  });

  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    learningPath: "",
    learningGoal: "",
    activity: "",
    assessment: ""
  });

  const [materialForm, setMaterialForm] = useState({
    title: "",
    type: "file", // "file" or "link"
    linkUrl: "",
    file: null as File | null,
    order: 0
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.role !== "teacher") {
          window.location.href = "/hub/dashboard";
          return;
        }
        setUser(parsed);
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }
  }, []);

  const fetchAtpDetail = async () => {
    if (!user || !id) return;
    setLoading(true);
    setError("");
    try {
      const isTeacher = user.role === "teacher";
      
      if (isTeacher) {
        // Guru: panggil endpoint detail ATP langsung
        const res = await apiService.getById("/atp", id as string);
        if (res.success && res.data) {
          setRps(res.data);
          setAtpForm({
            learningObjective: res.data.learningObjective || "",
            learningStrategy: res.data.learningStrategy || "",
            teacherNote: res.data.teacherNote || ""
          });
        } else {
          setError("Gagal memuat rencana pembelajaran.");
        }
      } else {
        // Siswa: cari dari published ATP yang di-return untuk kelasnya
        const res = await apiService.getAll("/atp/student/my-atp");
        const found = (res.data || []).find((r: any) => r.id === Number(id));
        if (found) {
          setRps(found);
        } else {
          setError("Rencana pembelajaran tidak ditemukan atau belum dipublikasikan oleh guru.");
        }
      }
    } catch (err: any) {
      console.error("[Fetch ATP Detail Error]", err);
      setError(err.response?.data?.message || "Terjadi kesalahan server saat memuat rincian ATP.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAtpDetail();
  }, [user, id]);

  const isTeacher = user?.role === "teacher";

  const toggleMeeting = (meetingId: number) => {
    setExpandedMeetings(prev =>
      prev.includes(meetingId) ? prev.filter(mid => mid !== meetingId) : [...prev, meetingId]
    );
  };

  // ══════════════════════════════════════════════
  // HEADER EDITING FUNCTIONS
  // ══════════════════════════════════════════════

  const handleUpdateAtpHeader = async () => {
    setActionLoading("update-header");
    try {
      await api.put(`/atp/${id}`, atpForm);
      toast.success("Informasi rencana pembelajaran berhasil diperbarui.");
      setIsEditAtpModalOpen(false);
      fetchAtpDetail();
    } catch (err) {
      toast.error("Gagal memperbarui informasi plans.");
    } finally {
      setActionLoading(null);
    }
  };

  // ══════════════════════════════════════════════
  // MEETING EDITING FUNCTIONS
  // ══════════════════════════════════════════════

  const openEditMeetingModal = (meeting: any) => {
    setSelectedMeeting(meeting);
    setMeetingForm({
      title: meeting.title || "",
      learningPath: meeting.learningPath || "",
      learningGoal: meeting.learningGoal || "",
      activity: meeting.activity || "",
      assessment: meeting.assessment || ""
    });
    setIsEditMeetingModalOpen(true);
  };

  const handleUpdateMeeting = async () => {
    if (!selectedMeeting) return;
    setActionLoading("update-meeting");
    try {
      await api.put(`/atp/${id}/meetings/${selectedMeeting.id}`, meetingForm);
      toast.success(`Pertemuan ${selectedMeeting.meetingNumber} berhasil diperbarui.`);
      setIsEditMeetingModalOpen(false);
      fetchAtpDetail();
    } catch (err) {
      toast.error("Gagal menyimpan pertemuan.");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublishMeeting = async (meetingId: number, meetingNum: number) => {
    if (!confirm(`Publikasikan pertemuan ${meetingNum}? Siswa akan dapat melihat isi detail materi pertemuan ini.`)) return;
    setActionLoading(`publish-meeting-${meetingId}`);
    try {
      await api.put(`/atp/${id}/meetings/${meetingId}/publish`);
      toast.success(`Pertemuan ${meetingNum} telah dipublikasikan.`);
      fetchAtpDetail();
    } catch (err) {
      toast.error("Gagal mempublikasikan pertemuan.");
    } finally {
      setActionLoading(null);
    }
  };

  // ══════════════════════════════════════════════
  // MATERIALS MANAGEMENT FUNCTIONS
  // ══════════════════════════════════════════════

  const openUploadMaterialModal = (meeting: any) => {
    setSelectedMeeting(meeting);
    setMaterialForm({
      title: "",
      type: "file",
      linkUrl: "",
      file: null,
      order: (meeting.materials?.length || 0) + 1
    });
    setIsUploadMaterialModalOpen(true);
  };

  const handleAddMaterial = async () => {
    if (!selectedMeeting) return;
    if (!materialForm.title) {
      toast.error("Judul materi wajib diisi.");
      return;
    }

    setActionLoading("add-material");
    try {
      if (materialForm.type === "link") {
        if (!materialForm.linkUrl) {
          toast.error("URL link wajib diisi.");
          setActionLoading(null);
          return;
        }
        await apiService.create(`atp/${id}/meetings/${selectedMeeting.id}/materials/link`, {
          title: materialForm.title,
          url: materialForm.linkUrl
        });
      } else {
        if (!materialForm.file) {
          toast.error("Silakan pilih file terlebih dahulu.");
          setActionLoading(null);
          return;
        }
        const fd = new FormData();
        fd.append("file", materialForm.file);
        fd.append("title", materialForm.title);
        fd.append("order", materialForm.order.toString());

        await api.post(`/atp/${id}/meetings/${selectedMeeting.id}/materials/upload`, fd);
      }

      toast.success("Materi berhasil ditambahkan ke pertemuan.");
      setIsUploadMaterialModalOpen(false);
      fetchAtpDetail();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Gagal mengunggah materi.";
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteMaterial = async (meetingId: number, materialId: number) => {
    if (!confirm("Hapus materi ini? File fisik di server juga akan dihapus.")) return;
    setActionLoading(`delete-material-${materialId}`);
    try {
      await api.delete(`/atp/${id}/meetings/${meetingId}/materials/${materialId}`);
      toast.success("Materi berhasil dihapus.");
      fetchAtpDetail();
    } catch (err) {
      toast.error("Gagal menghapus materi.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccessMaterial = async (mat: any) => {
    if (!isTeacher) {
      // Siswa: log akses materi
      try {
        await api.post(`/atp/student/materials/${mat.id}/access`);
      } catch (e) {
        console.error("Failed to track access logs.");
      }
    }

    // Upload files: use a relative path so the Next.js rewrite handles the host.
    const host = "";
    const downloadUrl = mat.fileUrl.startsWith("http") ? mat.fileUrl : `${host}${mat.fileUrl}`;
    window.open(downloadUrl, "_blank");
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case "pdf": return <FileText size={18} />;
      case "ppt":
      case "pptx": return <BookOpen size={18} />;
      case "docx": return <FileIcon size={18} />;
      case "video_link": return <Video size={18} />;
      case "image": return <ImageIcon size={18} />;
      case "zip": return <FileIcon size={18} />;
      case "link": return <Globe size={18} />;
      default: return <FileIcon size={18} />;
    }
  };

  const getMaterialColor = (type: string) => {
    switch (type) {
      case "pdf": return "bg-red-50 text-red-600 border-red-100";
      case "ppt":
      case "pptx": return "bg-brand/10 text-brand border-brand/20";
      case "docx": return "bg-brand/10 text-brand border-brand/20";
      case "video_link": return "bg-rose-50 text-rose-600 border-rose-100";
      case "image": return "bg-brand/10 text-brand border-brand/20";
      case "zip": return "bg-violet-50 text-violet-600 border-violet-100";
      case "link": return "bg-brand/10 text-brand border-brand/20";
      default: return "bg-slate-50 text-slate-700 border-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-brand animate-duration-1000" size={48} />
        <p className="text-muted-foreground animate-pulse text-sm">Memuat detail rencana pembelajaran...</p>
      </div>
    );
  }

  if (error || !rps) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-10">
        <div className="p-6 bg-red-50 border border-red-100 rounded-3xl text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center text-red-500 mx-auto">
            <Info size={28} />
          </div>
          <h3 className="text-lg font-bold text-red-900 tracking-tight">Gagal Memuat Halaman</h3>
          <p className="text-sm text-red-700 max-w-md mx-auto">{error || "Data rencana pembelajaran tidak valid."}</p>
          <Button onClick={() => router.push("/hub/atp")} className="bg-brand hover:bg-brand rounded-xl">
            Kembali ke Dashboard ATP
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      {/* Navigation & Title */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/hub/atp")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand bg-brand/10 hover:bg-brand/10 rounded-lg px-3 py-1.5 transition-colors"
        >
          <ArrowLeft size={14} />
          Kembali ke Dashboard
        </button>

        {isTeacher && (
          <Badge className={`capitalize rounded-full font-bold px-3 py-1 text-[11px] ${
            rps.status === "published" ? "bg-brand/10 text-brand border border-brand/20" :
            rps.status === "draft" ? "bg-brand/10 text-brand border border-brand/20" :
            "bg-slate-100 text-slate-800 border border-slate-200"
          }`}>
            Status: {rps.status}
          </Badge>
        )}
      </div>

      {/* Main Info Card */}
      <Card className="bg-white border border-brand/20/50 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-brand/100/5 rounded-bl-full shrink-0"></div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-brand uppercase tracking-widest">
              <Calendar size={12} />
              {rps.academicYear?.name || "Tahun Ajaran"} • {rps.academicYear?.semester === "odd" ? "Ganjil" : "Genap"}
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-teal-950 tracking-tight font-bold">
              {rps.subject?.name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground mt-1.5 font-medium">
              <span className="flex items-center gap-1">
                <Layers size={13} className="text-brand" />
                Kelas: <strong className="text-brand font-bold">{rps.class?.name}</strong>
              </span>
              <span className="text-gray-300">|</span>
              <span>{rps.totalMeetings || 16} Sesi Pertemuan</span>
              {rps.publishedAt && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-brand font-bold">Rilis: {new Date(rps.publishedAt).toLocaleDateString("id-ID")}</span>
                </>
              )}
            </div>
          </div>

          {/* Nomor Induk */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-brand/10/20 border border-brand/20/30 rounded-2xl p-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Nomor Induk ATP</span>
              <span className="font-mono text-xs font-black text-teal-950 mt-0.5 block">{rps.nomorInduk1}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Nomor Modul Ajar (MOD)</span>
              <span className="font-mono text-xs font-black text-teal-950 mt-0.5 block">{rps.nomorInduk2}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Nomor Alur Tujuan (ATP)</span>
              <span className="font-mono text-xs font-black text-teal-950 mt-0.5 block">{rps.nomorInduk3}</span>
            </div>
          </div>

          {/* Standard Merdeka Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-teal-50">
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-teal-950 uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={14} className="text-brand" />
                1. Tujuan Capaian Pembelajaran (CP / ATP)
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed bg-slate-50 p-4 rounded-2xl border border-gray-100 min-h-[80px]">
                {rps.learningObjective || "Belum ditentukan oleh pengampu rencana."}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-teal-950 uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={14} className="text-brand" />
                2. Strategi Capaian Semester
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed bg-slate-50 p-4 rounded-2xl border border-gray-100 min-h-[80px]">
                {rps.learningStrategy || "Belum ditentukan oleh pengampu rencana."}
              </p>
            </div>
          </div>

          {rps.teacherNote && (
            <div className="bg-brand/10/40 border border-brand/20 rounded-2xl p-4 flex gap-3 text-xs text-brand">
              <Info size={18} className="shrink-0 mt-0.5 text-brand" />
              <div>
                <h5 className="font-bold text-brand">Catatan Khusus Pengajar:</h5>
                <p className="mt-1 font-light leading-relaxed">"{rps.teacherNote}"</p>
              </div>
            </div>
          )}

          {isTeacher && (
            <div className="pt-2">
              <Button
                onClick={() => setIsEditAtpModalOpen(true)}
                className="bg-brand hover:bg-brand text-white rounded-xl text-xs font-bold gap-1 px-4"
              >
                <Edit size={14} />
                Edit Parameter Rencana
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Rencana Pertemuan Section */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-teal-950 text-lg flex items-center gap-2 tracking-tight font-bold">
          <BookOpen size={20} className="text-brand" />
          Rencana Pertemuan Semester
        </h3>

        <div className="space-y-4">
          {rps.meetings?.map((meeting: any) => {
            const isExpanded = expandedMeetings.includes(meeting.id);
            const isMeetingDraft = meeting.status === "draft";

            return (
              <Card
                key={meeting.id}
                className={`bg-white border rounded-2xl shadow-sm transition-all duration-300 overflow-hidden ${
                  isExpanded ? "border-brand/20 ring-2 ring-teal-50" : "border-brand/20/50 hover:border-brand/20"
                }`}
              >
                {/* Header Accordion Clickable */}
                <div
                  onClick={() => toggleMeeting(meeting.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-brand/10/10 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                    <div className="h-10 w-10 rounded-xl bg-brand/10 text-brand font-black flex items-center justify-center shrink-0 shadow-sm text-sm">
                      {meeting.meetingNumber}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-teal-950 text-sm md:text-base truncate">
                        {meeting.title || `Pertemuan Ke-${meeting.meetingNumber}`}
                      </h4>
                      
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {meeting.materials?.length || 0} Materi terlampir
                        </span>
                        
                        {isTeacher && isMeetingDraft && (
                          <span className="bg-brand/10 text-brand border border-brand/20 rounded text-[9px] font-bold px-1.5">
                            Draft
                          </span>
                        )}

                        {meeting.publishedAt && (
                          <span className="text-[9px] text-brand font-bold flex items-center gap-0.5">
                            <CheckCircle size={10} /> Terpublikasi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-brand">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="border-t border-teal-50 bg-slate-50/10 p-5 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* CP Meeting */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-brand block">Tujuan Pembelajaran Sesi</span>
                        <div className="bg-white border border-teal-50/60 rounded-xl p-3 text-xs text-muted-foreground leading-relaxed">
                          {meeting.learningGoal || <em className="text-slate-500">Belum diisi.</em>}
                        </div>
                      </div>

                      {/* Alur Pembelajaran */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-brand block">Alur Pembelajaran (CP ↔ ATP)</span>
                        <div className="bg-white border border-teal-50/60 rounded-xl p-3 text-xs text-muted-foreground leading-relaxed">
                          {meeting.learningPath || <em className="text-slate-500">Belum diisi.</em>}
                        </div>
                      </div>

                      {/* Aktivitas Belajar */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-brand block">Aktivitas & Metode Belajar</span>
                        <div className="bg-white border border-teal-50/60 rounded-xl p-3 text-xs text-muted-foreground leading-relaxed">
                          {meeting.activity || <em className="text-slate-500">Belum diisi.</em>}
                        </div>
                      </div>

                      {/* Penilaian / Asesmen */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-brand block">Penilaian & Kriteria Kelulusan</span>
                        <div className="bg-white border border-teal-50/60 rounded-xl p-3 text-xs text-muted-foreground leading-relaxed">
                          {meeting.assessment || <em className="text-slate-500">Belum diisi.</em>}
                        </div>
                      </div>
                    </div>

                    {/* Materials Sub-Section */}
                    <div className="space-y-3 pt-4 border-t border-teal-50">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-extrabold text-teal-950 uppercase tracking-widest flex items-center gap-1.5">
                          <FileText size={15} className="text-brand" />
                          Materi Pembelajaran Pertemuan
                        </h5>

                        {isTeacher && (
                          <Button
                            onClick={() => openUploadMaterialModal(meeting)}
                            variant="secondary"
                            size="sm"
                            className="text-brand bg-brand/10 hover:bg-brand/10 border border-brand/20 rounded-xl text-[10px] font-bold h-7 gap-1 px-2.5"
                          >
                            <Plus size={11} className="stroke-[3px]" /> Lampirkan Materi
                          </Button>
                        )}
                      </div>

                      {/* List Materials */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {meeting.materials && meeting.materials.length > 0 ? (
                          meeting.materials.map((mat: any) => (
                            <div
                              key={mat.id}
                              onClick={() => handleAccessMaterial(mat)}
                              className="group flex items-center justify-between p-3.5 bg-white border border-teal-50/80 rounded-xl hover:shadow-md hover:border-brand/20 transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border shadow-sm ${getMaterialColor(mat.type)}`}>
                                  {getMaterialIcon(mat.type)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h6 className="font-bold text-teal-950 text-xs truncate group-hover:text-brand transition-colors pr-2">
                                    {mat.title}
                                  </h6>
                                  <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground uppercase font-semibold">
                                    <span>{mat.type}</span>
                                    {isTeacher && mat._count?.accesses > 0 && (
                                      <>
                                        <span>•</span>
                                        <span className="text-brand font-bold">Diakses {mat._count.accesses} siswa</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="h-7 w-7 rounded-full bg-brand/10 text-brand flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-all">
                                  <ExternalLink size={12} />
                                </div>
                                {isTeacher && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMaterial(meeting.id, mat.id);
                                    }}
                                    disabled={actionLoading === `delete-material-${mat.id}`}
                                    className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-all"
                                  >
                                    {actionLoading === `delete-material-${mat.id}` ? <Loader2 className="animate-spin h-3.5 w-3.5 text-red-500" /> : <Trash2 size={13} />}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 text-center py-6 border border-dashed border-teal-50 rounded-xl">
                            <p className="text-[11px] text-muted-foreground italic">Belum ada materi terunggah untuk pertemuan ini.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Teacher Action Controls for Meeting */}
                    {isTeacher && (
                      <div className="flex justify-end gap-2 pt-3 border-t border-teal-50/50">
                        <Button
                          onClick={() => openEditMeetingModal(meeting)}
                          variant="secondary"
                          size="sm"
                          className="h-8 text-xs font-bold rounded-xl"
                        >
                          Edit Isi Pertemuan
                        </Button>

                        {isMeetingDraft && (
                          <Button
                            onClick={() => handlePublishMeeting(meeting.id, meeting.meetingNumber)}
                            disabled={actionLoading === `publish-meeting-${meeting.id}`}
                            className="bg-brand hover:bg-brand text-white h-8 text-xs font-bold rounded-xl px-4"
                          >
                            {actionLoading === `publish-meeting-${meeting.id}` ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : "Publish Pertemuan"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          MODAL 1: EDIT RPS HEADER
          ────────────────────────────────────────────── */}
      <Modal isOpen={isEditAtpModalOpen} onClose={() => !actionLoading && setIsEditAtpModalOpen(false)} title="Edit Parameter Rencana">
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-teal-950">Tujuan Capaian Pembelajaran (CP / ATP)</label>
            <textarea
              className="w-full rounded-xl border border-brand/20 p-3 text-xs focus:ring-2 focus:ring-brand transition-all"
              rows={4}
              placeholder="Contoh: Siswa mampu memecahkan persamaan linear satu variabel..."
              value={atpForm.learningObjective}
              onChange={(e) => setAtpForm({ ...atpForm, learningObjective: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-teal-950">Strategi Pembelajaran Semester</label>
            <textarea
              className="w-full rounded-xl border border-brand/20 p-3 text-xs focus:ring-2 focus:ring-brand transition-all"
              rows={4}
              placeholder="Contoh: Diskusi aktif, Flipped Classroom, Eksplorasi Geogebra..."
              value={atpForm.learningStrategy}
              onChange={(e) => setAtpForm({ ...atpForm, learningStrategy: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-teal-950">Catatan Khusus Pengajar</label>
            <textarea
              className="w-full rounded-xl border border-brand/20 p-3 text-xs focus:ring-2 focus:ring-brand transition-all"
              rows={3}
              placeholder="..."
              value={atpForm.teacherNote}
              onChange={(e) => setAtpForm({ ...atpForm, teacherNote: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-teal-50">
            <Button variant="secondary" onClick={() => setIsEditAtpModalOpen(false)} disabled={!!actionLoading} className="rounded-xl">
              Batal
            </Button>
            <Button
              onClick={handleUpdateAtpHeader}
              disabled={actionLoading === "update-header"}
              className="bg-brand hover:bg-brand text-white rounded-xl px-5 font-bold"
            >
              {actionLoading === "update-header" ? <Loader2 className="animate-spin h-4 w-4" /> : "Simpan Perubahan"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ──────────────────────────────────────────────
          MODAL 2: EDIT MEETING DETAILS
          ────────────────────────────────────────────── */}
      <Modal
        isOpen={isEditMeetingModalOpen}
        onClose={() => !actionLoading && setIsEditMeetingModalOpen(false)}
        title={selectedMeeting ? `Edit Rincian Pertemuan ${selectedMeeting.meetingNumber}` : "Edit Isi Pertemuan"}
      >
        <div className="p-6 space-y-4 max-h-[450px] overflow-y-auto pr-1">
          <Input
            id="meetingTitle"
            name="meetingTitle"
            label="Judul Sesi Pertemuan"
            placeholder="Contoh: Eksplorasi Rumus Fungsi Linear"
            value={meetingForm.title}
            onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
          />

          <div className="space-y-1">
            <label className="block text-xs font-bold text-teal-950">Tujuan Pembelajaran Sesi</label>
            <textarea
              className="w-full rounded-xl border border-brand/20 p-3 text-xs focus:ring-2 focus:ring-brand transition-all"
              rows={3}
              placeholder="Contoh: Siswa memahami keterkaitan x dan y dalam rumus..."
              value={meetingForm.learningGoal}
              onChange={(e) => setMeetingForm({ ...meetingForm, learningGoal: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-teal-950">Alur Pembelajaran (CP ↔ ATP)</label>
            <textarea
              className="w-full rounded-xl border border-brand/20 p-3 text-xs focus:ring-2 focus:ring-brand transition-all"
              rows={3}
              placeholder="Contoh: Pengamatan tabel → Generalisasi rumus..."
              value={meetingForm.learningPath}
              onChange={(e) => setMeetingForm({ ...meetingForm, learningPath: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-teal-950">Aktivitas & Metode Belajar</label>
            <textarea
              className="w-full rounded-xl border border-brand/20 p-3 text-xs focus:ring-2 focus:ring-brand transition-all"
              rows={3}
              placeholder="Contoh: Kerja kelompok, Pemaparan Geogebra, Kuis Interaktif..."
              value={meetingForm.activity}
              onChange={(e) => setMeetingForm({ ...meetingForm, activity: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-teal-950">Penilaian & Kriteria Kelulusan</label>
            <textarea
              className="w-full rounded-xl border border-brand/20 p-3 text-xs focus:ring-2 focus:ring-brand transition-all"
              rows={3}
              placeholder="Contoh: Tugas portofolio grafik (40%), Rubrik penilaian diskusi kelompok (60%)..."
              value={meetingForm.assessment}
              onChange={(e) => setMeetingForm({ ...meetingForm, assessment: e.target.value })}
            />
          </div>
        </div>

        <div className="p-6 flex justify-end gap-3 border-t border-teal-50 shrink-0">
          <Button variant="secondary" onClick={() => setIsEditMeetingModalOpen(false)} disabled={!!actionLoading} className="rounded-xl">
            Batal
          </Button>
          <Button
            onClick={handleUpdateMeeting}
            disabled={actionLoading === "update-meeting"}
            className="bg-brand hover:bg-brand text-white rounded-xl px-5 font-bold"
          >
            {actionLoading === "update-meeting" ? <Loader2 className="animate-spin h-4 w-4" /> : "Simpan Sesi"}
          </Button>
        </div>
      </Modal>

      {/* ──────────────────────────────────────────────
          MODAL 3: UPLOAD MATERIAL
          ────────────────────────────────────────────── */}
      <Modal isOpen={isUploadMaterialModalOpen} onClose={() => !actionLoading && setIsUploadMaterialModalOpen(false)} title="Lampirkan Materi Pembelajaran">
        <div className="p-6 space-y-4">
          <Input
            id="materialTitle"
            name="materialTitle"
            label="Judul/Nama Materi"
            placeholder="Contoh: Slides Pertemuan Aljabar"
            value={materialForm.title}
            onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
          />

          <div className="space-y-2">
            <label className="block text-xs font-bold text-teal-950">Jenis Lampiran</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-xs text-teal-950 cursor-pointer">
                <input
                  type="radio"
                  name="materialType"
                  value="file"
                  checked={materialForm.type === "file"}
                  onChange={() => setMaterialForm({ ...materialForm, type: "file", linkUrl: "" })}
                  className="accent-teal-600"
                />
                Upload File Fisik
              </label>
              <label className="flex items-center gap-1.5 text-xs text-teal-950 cursor-pointer">
                <input
                  type="radio"
                  name="materialType"
                  value="link"
                  checked={materialForm.type === "link"}
                  onChange={() => setMaterialForm({ ...materialForm, type: "link", file: null })}
                  className="accent-teal-600"
                />
                Tautkan Link (URL)
              </label>
            </div>
          </div>

          {materialForm.type === "link" ? (
            <Input
              id="materialUrl"
              name="materialUrl"
              label="URL Materi (http/https)"
              placeholder="Contoh: https://youtube.com/watch?v=..."
              value={materialForm.linkUrl}
              onChange={(e) => setMaterialForm({ ...materialForm, linkUrl: e.target.value })}
            />
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-teal-950">Pilih Dokumen/Materi</label>
              <div className="border-2 border-dashed border-brand/20 hover:border-brand/20 rounded-xl p-6 text-center bg-slate-50/50 relative cursor-pointer group transition-all duration-300">
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setMaterialForm({
                      ...materialForm,
                      file: f,
                      title: materialForm.title || (f ? f.name.substring(0, f.name.lastIndexOf(".")) : "")
                    });
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-1">
                  <div className="h-10 w-10 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto shadow-sm">
                    <Upload size={18} />
                  </div>
                  <p className="text-xs font-bold text-teal-950">
                    {materialForm.file ? materialForm.file.name : "Klik atau seret file ke sini"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    PDF, PPT, DOC, MP4, JPEG, PNG, ZIP (Maksimal 20MB)
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-teal-50">
            <Button
              variant="secondary"
              onClick={() => {
                setIsUploadMaterialModalOpen(false);
                setMaterialForm({ title: "", type: "file", linkUrl: "", file: null, order: 0 });
              }}
              disabled={!!actionLoading}
              className="rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleAddMaterial}
              disabled={actionLoading === "add-material" || !materialForm.title || (materialForm.type === "file" && !materialForm.file) || (materialForm.type === "link" && !materialForm.linkUrl)}
              className="bg-brand hover:bg-brand text-white rounded-xl px-5 font-bold"
            >
              {actionLoading === "add-material" ? <Loader2 className="animate-spin h-4 w-4" /> : "Simpan Materi"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
