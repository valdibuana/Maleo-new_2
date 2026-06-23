import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEADLINE = new Date("2026-07-06T00:00:00Z");

const SCHEDULE_DATA: Record<number, Record<string, any[]>> = {
  10: {
    Senin: [
      { timeSlot: "07:30-08:00", jpLabel: "Pembiasaan", slotType: "pembiasaan", subjectName: "Upacara Bendera", teacherName: null },
      { timeSlot: "08:00-08:35", jpLabel: "JP 1", slotType: "academic", subjectName: "MTK", teacherName: "Bu Adab" },
      { timeSlot: "08:35-09:10", jpLabel: "JP 2", slotType: "academic", subjectName: "MTK", teacherName: "Bu Adab" },
      { timeSlot: "09:10-09:45", jpLabel: "JP 3", slotType: "academic", subjectName: "Ekonomi", teacherName: "Pak Djoen" },
      { timeSlot: "09:45-10:20", jpLabel: "JP 4", slotType: "academic", subjectName: "Ekonomi", teacherName: "Pak Djoen" },
      { timeSlot: "10:20-10:30", jpLabel: "ISTIRAHAT", slotType: "istirahat", subjectName: "ISTIRAHAT", teacherName: null },
      { timeSlot: "10:30-11:05", jpLabel: "JP 5", slotType: "academic", subjectName: "Sejarah", teacherName: "Pak Khairul" },
      { timeSlot: "11:05-11:40", jpLabel: "JP 6", slotType: "academic", subjectName: "Sejarah", teacherName: "Pak Khairul" },
      { timeSlot: "11:40-13:00", jpLabel: "ISHOMA", slotType: "ishoma", subjectName: "ISHOMA", teacherName: null },
      { timeSlot: "13:00-13:35", jpLabel: "JP 7", slotType: "academic", subjectName: "PKWU", teacherName: "Bu Nia" },
      { timeSlot: "13:35-14:20", jpLabel: "JP 8", slotType: "academic", subjectName: "PKWU", teacherName: "Bu Nia" },
    ],
    Selasa: [
      { timeSlot: "07:30-08:00", jpLabel: "Pembiasaan", slotType: "pembiasaan", subjectName: "Literasi (Sahabat Pena)", teacherName: null },
      { timeSlot: "08:00-08:35", jpLabel: "JP 1", slotType: "academic", subjectName: "B.Inggris", teacherName: "Bu Rina Palupi" },
      { timeSlot: "08:35-09:10", jpLabel: "JP 2", slotType: "academic", subjectName: "B.Inggris", teacherName: "Bu Rina Palupi" },
      { timeSlot: "09:10-09:45", jpLabel: "JP 3", slotType: "academic", subjectName: "PKN", teacherName: "Pak Irwan" },
      { timeSlot: "09:45-10:20", jpLabel: "JP 4", slotType: "academic", subjectName: "PKN", teacherName: "Pak Irwan" },
      { timeSlot: "10:20-10:30", jpLabel: "ISTIRAHAT", slotType: "istirahat", subjectName: "ISTIRAHAT", teacherName: null },
      { timeSlot: "10:30-11:05", jpLabel: "JP 5", slotType: "academic", subjectName: "AP", teacherName: "Bu Avie" },
      { timeSlot: "11:05-11:40", jpLabel: "JP 6", slotType: "academic", subjectName: "AP", teacherName: "Bu Avie" },
      { timeSlot: "11:40-13:00", jpLabel: "ISHOMA", slotType: "ishoma", subjectName: "ISHOMA", teacherName: null },
      { timeSlot: "13:00-13:35", jpLabel: "JP 7", slotType: "academic", subjectName: "PJOK", teacherName: "Pak Deni" },
      { timeSlot: "13:35-14:20", jpLabel: "JP 8", slotType: "academic", subjectName: "PJOK", teacherName: "Pak Deni" },
    ],
    Rabu: [
      { timeSlot: "07:30-08:00", jpLabel: "Pembiasaan", slotType: "pembiasaan", subjectName: "Sholat Dhuha & Tadarus", teacherName: null },
      { timeSlot: "08:00-08:35", jpLabel: "JP 1", slotType: "academic", subjectName: "TIK", teacherName: "Pak Ade" },
      { timeSlot: "08:35-09:10", jpLabel: "JP 2", slotType: "academic", subjectName: "TIK", teacherName: "Pak Ade" },
      { timeSlot: "09:10-09:45", jpLabel: "JP 3", slotType: "academic", subjectName: "PAI", teacherName: "Pak Afrizal" },
      { timeSlot: "09:45-10:20", jpLabel: "JP 4", slotType: "academic", subjectName: "PAI", teacherName: "Pak Afrizal" },
      { timeSlot: "10:20-10:30", jpLabel: "ISTIRAHAT", slotType: "istirahat", subjectName: "ISTIRAHAT", teacherName: null },
      { timeSlot: "10:30-11:05", jpLabel: "JP 5", slotType: "academic", subjectName: "Geografi", teacherName: "Bu Mira" },
      { timeSlot: "11:05-11:40", jpLabel: "JP 6", slotType: "academic", subjectName: "Geografi", teacherName: "Bu Mira" },
      { timeSlot: "11:40-13:00", jpLabel: "ISHOMA", slotType: "ishoma", subjectName: "ISHOMA", teacherName: null },
      { timeSlot: "13:00-13:35", jpLabel: "JP 7", slotType: "academic", subjectName: "[KOSONG]", teacherName: null },
    ],
    Kamis: [
      { timeSlot: "07:30-08:00", jpLabel: "Pembiasaan", slotType: "pembiasaan", subjectName: "Al-Ma'surat", teacherName: null },
      { timeSlot: "08:00-08:35", jpLabel: "JP 1", slotType: "academic", subjectName: "Sosiologi", teacherName: "Bu Trisna" },
      { timeSlot: "08:35-09:10", jpLabel: "JP 2", slotType: "academic", subjectName: "Sosiologi", teacherName: "Bu Trisna" },
      { timeSlot: "09:10-09:45", jpLabel: "JP 3", slotType: "academic", subjectName: "Art", teacherName: "Pak Latief" },
      { timeSlot: "09:45-10:20", jpLabel: "JP 4", slotType: "academic", subjectName: "Art", teacherName: "Pak Latief" },
      { timeSlot: "10:20-10:30", jpLabel: "ISTIRAHAT", slotType: "istirahat", subjectName: "ISTIRAHAT", teacherName: null },
      { timeSlot: "10:30-11:05", jpLabel: "JP 5", slotType: "academic", subjectName: "ART Digital", teacherName: null },
      { timeSlot: "11:05-11:40", jpLabel: "JP 6", slotType: "academic", subjectName: "ART Digital", teacherName: null },
      { timeSlot: "11:40-13:00", jpLabel: "ISHOMA", slotType: "ishoma", subjectName: "ISHOMA", teacherName: null },
      { timeSlot: "13:00-13:35", jpLabel: "JP 7", slotType: "special", subjectName: "Guru Tamu", teacherName: null },
    ],
    Jumat: [
      { timeSlot: "07:30-08:00", jpLabel: "Pembiasaan", slotType: "pembiasaan", subjectName: "Tadarus (Surat Yasin)", teacherName: null },
      { timeSlot: "08:00-08:35", jpLabel: "JP 1", slotType: "academic", subjectName: "Kom.Digital", teacherName: "Pak Jamal" },
      { timeSlot: "08:35-09:10", jpLabel: "JP 2", slotType: "academic", subjectName: "Kom.Digital", teacherName: "Pak Jamal" },
      { timeSlot: "09:10-09:45", jpLabel: "JP 3", slotType: "academic", subjectName: "Lit.Digital", teacherName: "Bu Tinuk" },
      { timeSlot: "09:45-10:20", jpLabel: "JP 4", slotType: "academic", subjectName: "Lit.Digital", teacherName: "Bu Tinuk" },
      { timeSlot: "10:20-10:30", jpLabel: "ISTIRAHAT", slotType: "istirahat", subjectName: "ISTIRAHAT", teacherName: null },
      { timeSlot: "10:30-11:05", jpLabel: "JP 5", slotType: "academic", subjectName: "B.Indonesia", teacherName: "Bu Hanni" },
      { timeSlot: "11:05-11:40", jpLabel: "JP 6", slotType: "academic", subjectName: "B.Indonesia", teacherName: "Bu Hanni" },
      { timeSlot: "11:40-13:00", jpLabel: "ISHOMA", slotType: "ishoma", subjectName: "ISHOMA", teacherName: null },
      { timeSlot: "13:00-13:35", jpLabel: "JP 7", slotType: "special", subjectName: "Ekskul Kesenian", teacherName: null },
    ]
  },
  11: {
    Senin: [
      { timeSlot: "07:30-08:00", jpLabel: "Pembiasaan", slotType: "pembiasaan", subjectName: "Upacara Bendera", teacherName: null },
      { timeSlot: "08:00-08:35", jpLabel: "JP 1", slotType: "academic", subjectName: "B.Indonesia", teacherName: "Bu Hanni" },
      { timeSlot: "08:35-09:10", jpLabel: "JP 2", slotType: "academic", subjectName: "B.Indonesia", teacherName: "Bu Hanni" },
      { timeSlot: "09:10-09:45", jpLabel: "JP 3", slotType: "academic", subjectName: "Sejarah", teacherName: "Pak Khairul" },
      { timeSlot: "09:45-10:20", jpLabel: "JP 4", slotType: "academic", subjectName: "Sejarah", teacherName: "Pak Khairul" },
      { timeSlot: "10:20-10:30", jpLabel: "ISTIRAHAT", slotType: "istirahat", subjectName: "ISTIRAHAT", teacherName: null },
      { timeSlot: "10:30-11:05", jpLabel: "JP 5", slotType: "academic", subjectName: "Ekonomi", teacherName: "Pak Djoen" },
      { timeSlot: "11:05-11:40", jpLabel: "JP 6", slotType: "academic", subjectName: "Ekonomi", teacherName: "Pak Djoen" },
      { timeSlot: "11:40-13:00", jpLabel: "ISHOMA", slotType: "ishoma", subjectName: "ISHOMA", teacherName: null },
      { timeSlot: "13:00-13:35", jpLabel: "JP 7", slotType: "academic", subjectName: "PJOK", teacherName: "Pak Deni" },
      { timeSlot: "13:35-14:20", jpLabel: "JP 8", slotType: "academic", subjectName: "PJOK", teacherName: "Pak Deni" },
    ],
    Selasa: [
      { timeSlot: "07:30-08:00", jpLabel: "Pembiasaan", slotType: "pembiasaan", subjectName: "Literasi (Sahabat Pena)", teacherName: null },
      { timeSlot: "08:00-08:35", jpLabel: "JP 1", slotType: "academic", subjectName: "Sosiologi", teacherName: "Bu Trisna" },
      { timeSlot: "08:35-09:10", jpLabel: "JP 2", slotType: "academic", subjectName: "Sosiologi", teacherName: "Bu Trisna" },
      { timeSlot: "09:10-09:45", jpLabel: "JP 3", slotType: "academic", subjectName: "AP", teacherName: "Bu Avie" },
      { timeSlot: "09:45-10:20", jpLabel: "JP 4", slotType: "academic", subjectName: "AP", teacherName: "Bu Avie" },
      { timeSlot: "10:20-10:30", jpLabel: "ISTIRAHAT", slotType: "istirahat", subjectName: "ISTIRAHAT", teacherName: null },
      { timeSlot: "10:30-11:05", jpLabel: "JP 5", slotType: "academic", subjectName: "PKN", teacherName: "Pak Irwan" },
      { timeSlot: "11:05-11:40", jpLabel: "JP 6", slotType: "academic", subjectName: "PKN", teacherName: "Pak Irwan" },
      { timeSlot: "11:40-13:00", jpLabel: "ISHOMA", slotType: "ishoma", subjectName: "ISHOMA", teacherName: null },
      { timeSlot: "13:00-13:35", jpLabel: "JP 7", slotType: "special", subjectName: "Bola", teacherName: null },
      { timeSlot: "13:35-14:20", jpLabel: "JP 8", slotType: "special", subjectName: "Bola", teacherName: null },
    ],
    Rabu: [
      { timeSlot: "07:30-08:00", jpLabel: "Pembiasaan", slotType: "pembiasaan", subjectName: "Sholat Dhuha & Tadarus", teacherName: null },
      { timeSlot: "08:00-08:35", jpLabel: "JP 1", slotType: "academic", subjectName: "Geografi", teacherName: "Pak Hardjono" },
      { timeSlot: "08:35-09:10", jpLabel: "JP 2", slotType: "academic", subjectName: "Geografi", teacherName: "Pak Hardjono" },
      { timeSlot: "09:10-09:45", jpLabel: "JP 3", slotType: "academic", subjectName: "TIK", teacherName: null },
      { timeSlot: "09:45-10:20", jpLabel: "JP 4", slotType: "academic", subjectName: "TIK", teacherName: null },
      { timeSlot: "10:20-10:30", jpLabel: "ISTIRAHAT", slotType: "istirahat", subjectName: "ISTIRAHAT", teacherName: null },
      { timeSlot: "10:30-11:05", jpLabel: "JP 5", slotType: "academic", subjectName: "PAI", teacherName: "Pak Afrizal" },
      { timeSlot: "11:05-11:40", jpLabel: "JP 6", slotType: "academic", subjectName: "PAI", teacherName: "Pak Afrizal" },
      { timeSlot: "11:40-13:00", jpLabel: "ISHOMA", slotType: "ishoma", subjectName: "ISHOMA", teacherName: null },
      { timeSlot: "13:00-13:35", jpLabel: "JP 7", slotType: "academic", subjectName: "PKWU", teacherName: "Bu Nia" },
      { timeSlot: "13:35-14:20", jpLabel: "JP 8", slotType: "academic", subjectName: "PKWU", teacherName: "Bu Nia" },
    ],
    Kamis: [
      { timeSlot: "07:30-08:00", jpLabel: "Pembiasaan", slotType: "pembiasaan", subjectName: "Al-Ma'surat", teacherName: null },
      { timeSlot: "08:00-08:35", jpLabel: "JP 1", slotType: "academic", subjectName: "MTK", teacherName: null },
      { timeSlot: "08:35-09:10", jpLabel: "JP 2", slotType: "academic", subjectName: "MTK", teacherName: null },
      { timeSlot: "09:10-09:45", jpLabel: "JP 3", slotType: "academic", subjectName: "Art", teacherName: "Pak Latief" },
      { timeSlot: "09:45-10:20", jpLabel: "JP 4", slotType: "academic", subjectName: "Art", teacherName: "Pak Latief" },
      { timeSlot: "10:20-10:30", jpLabel: "ISTIRAHAT", slotType: "istirahat", subjectName: "ISTIRAHAT", teacherName: null },
      { timeSlot: "10:30-11:05", jpLabel: "JP 5", slotType: "academic", subjectName: "ART Digital", teacherName: null },
      { timeSlot: "11:05-11:40", jpLabel: "JP 6", slotType: "academic", subjectName: "ART Digital", teacherName: null },
      { timeSlot: "11:40-13:00", jpLabel: "ISHOMA", slotType: "ishoma", subjectName: "ISHOMA", teacherName: null },
      { timeSlot: "13:00-13:35", jpLabel: "JP 7", slotType: "special", subjectName: "Guru Tamu", teacherName: null },
    ],
    Jumat: [
      { timeSlot: "07:30-08:00", jpLabel: "Pembiasaan", slotType: "pembiasaan", subjectName: "Tadarus (Surat Yasin)", teacherName: null },
      { timeSlot: "08:00-08:35", jpLabel: "JP 1", slotType: "academic", subjectName: "Lit.Digital", teacherName: "Bu Tinuk" },
      { timeSlot: "08:35-09:10", jpLabel: "JP 2", slotType: "academic", subjectName: "Lit.Digital", teacherName: "Bu Tinuk" },
      { timeSlot: "09:10-09:45", jpLabel: "JP 3", slotType: "academic", subjectName: "Kom.Digital", teacherName: "Pak Jamal" },
      { timeSlot: "09:45-10:20", jpLabel: "JP 4", slotType: "academic", subjectName: "Kom.Digital", teacherName: "Pak Jamal" },
      { timeSlot: "10:20-10:30", jpLabel: "ISTIRAHAT", slotType: "istirahat", subjectName: "ISTIRAHAT", teacherName: null },
      { timeSlot: "10:30-11:05", jpLabel: "JP 5", slotType: "academic", subjectName: "B.Inggris", teacherName: "Pak Reza" },
      { timeSlot: "11:05-11:40", jpLabel: "JP 6", slotType: "academic", subjectName: "B.Inggris", teacherName: "Pak Reza" },
      { timeSlot: "11:40-13:00", jpLabel: "ISHOMA", slotType: "ishoma", subjectName: "ISHOMA", teacherName: null },
      { timeSlot: "13:00-13:35", jpLabel: "JP 7", slotType: "special", subjectName: "Ekskul Kesenian", teacherName: null },
    ]
  },
  12: {
    Senin: [
      { timeSlot: "07:30-08:00", jpLabel: "Pembiasaan", slotType: "pembiasaan", subjectName: "Upacara Bendera", teacherName: null },
      { timeSlot: "08:00-08:35", jpLabel: "JP 1", slotType: "academic", subjectName: "B.Inggris", teacherName: "Pak Sutopo" },
      { timeSlot: "08:35-09:10", jpLabel: "JP 2", slotType: "academic", subjectName: "B.Inggris", teacherName: "Pak Sutopo" },
      { timeSlot: "09:10-09:45", jpLabel: "JP 3", slotType: "academic", subjectName: "TIK", teacherName: null },
      { timeSlot: "09:45-10:20", jpLabel: "JP 4", slotType: "academic", subjectName: "TIK", teacherName: null },
      { timeSlot: "10:20-10:30", jpLabel: "ISTIRAHAT", slotType: "istirahat", subjectName: "ISTIRAHAT", teacherName: null },
      { timeSlot: "10:30-11:05", jpLabel: "JP 5", slotType: "academic", subjectName: "Pengembangan Diri", teacherName: "Bu Hanni" },
      { timeSlot: "11:05-11:40", jpLabel: "JP 6", slotType: "academic", subjectName: "Pengembangan Diri", teacherName: "Bu Hanni" },
      { timeSlot: "11:40-13:00", jpLabel: "ISHOMA", slotType: "ishoma", subjectName: "ISHOMA", teacherName: null },
      { timeSlot: "13:00-13:35", jpLabel: "JP 7", slotType: "academic", subjectName: "PKWU", teacherName: null },
      { timeSlot: "13:35-14:20", jpLabel: "JP 8", slotType: "academic", subjectName: "PKWU", teacherName: null },
    ],
    Selasa: [
      { timeSlot: "07:30-08:00", jpLabel: "Pembiasaan", slotType: "pembiasaan", subjectName: "Literasi (Sahabat Pena)", teacherName: null },
      { timeSlot: "08:00-08:35", jpLabel: "JP 1", slotType: "academic", subjectName: "Ekonomi", teacherName: "Pak Awi" },
      { timeSlot: "08:35-09:10", jpLabel: "JP 2", slotType: "academic", subjectName: "Ekonomi", teacherName: "Pak Awi" },
      { timeSlot: "09:10-09:45", jpLabel: "JP 3", slotType: "academic", subjectName: "Sejarah", teacherName: null },
      { timeSlot: "09:45-10:20", jpLabel: "JP 4", slotType: "academic", subjectName: "Sejarah", teacherName: null },
      { timeSlot: "10:20-10:30", jpLabel: "ISTIRAHAT", slotType: "istirahat", subjectName: "ISTIRAHAT", teacherName: null },
      { timeSlot: "10:30-11:05", jpLabel: "JP 5", slotType: "academic", subjectName: "Sosiologi", teacherName: "Bu Trisna" },
      { timeSlot: "11:05-11:40", jpLabel: "JP 6", slotType: "academic", subjectName: "Sosiologi", teacherName: "Bu Trisna" },
      { timeSlot: "11:40-13:00", jpLabel: "ISHOMA", slotType: "ishoma", subjectName: "ISHOMA", teacherName: null },
      { timeSlot: "13:00-13:35", jpLabel: "JP 7", slotType: "special", subjectName: "Bola", teacherName: null },
      { timeSlot: "13:35-14:20", jpLabel: "JP 8", slotType: "special", subjectName: "Bola", teacherName: null },
    ],
    Rabu: [
      { timeSlot: "07:30-08:00", jpLabel: "Pembiasaan", slotType: "pembiasaan", subjectName: "Sholat Dhuha & Tadarus", teacherName: null },
      { timeSlot: "08:00-08:35", jpLabel: "JP 1", slotType: "academic", subjectName: "Matematika", teacherName: "Pak Rudi" },
      { timeSlot: "08:35-09:10", jpLabel: "JP 2", slotType: "academic", subjectName: "Matematika", teacherName: "Pak Rudi" },
      { timeSlot: "09:10-09:45", jpLabel: "JP 3", slotType: "academic", subjectName: "Geografi", teacherName: "Bu Mira" },
      { timeSlot: "09:45-10:20", jpLabel: "JP 4", slotType: "academic", subjectName: "Geografi", teacherName: "Bu Mira" },
      { timeSlot: "10:20-10:30", jpLabel: "ISTIRAHAT", slotType: "istirahat", subjectName: "ISTIRAHAT", teacherName: null },
      { timeSlot: "10:30-11:05", jpLabel: "JP 5", slotType: "academic", subjectName: "AP", teacherName: "Bu Avie" },
      { timeSlot: "11:05-11:40", jpLabel: "JP 6", slotType: "academic", subjectName: "AP", teacherName: "Bu Avie" },
      { timeSlot: "11:40-13:00", jpLabel: "ISHOMA", slotType: "ishoma", subjectName: "ISHOMA", teacherName: null },
      { timeSlot: "13:00-13:35", jpLabel: "JP 7", slotType: "academic", subjectName: "PJOK", teacherName: "Pak Deni" },
      { timeSlot: "13:35-14:20", jpLabel: "JP 8", slotType: "academic", subjectName: "PJOK", teacherName: "Pak Deni" },
    ],
    Kamis: [
      { timeSlot: "07:30-08:00", jpLabel: "Pembiasaan", slotType: "pembiasaan", subjectName: "Al-Ma'surat", teacherName: null },
      { timeSlot: "08:00-08:35", jpLabel: "JP 1", slotType: "academic", subjectName: "B.Indonesia", teacherName: "Bu Hanni" },
      { timeSlot: "08:35-09:10", jpLabel: "JP 2", slotType: "academic", subjectName: "B.Indonesia", teacherName: "Bu Hanni" },
      { timeSlot: "09:10-09:45", jpLabel: "JP 3", slotType: "academic", subjectName: "Art", teacherName: "Pak Latief" },
      { timeSlot: "09:45-10:20", jpLabel: "JP 4", slotType: "academic", subjectName: "Art", teacherName: "Pak Latief" },
      { timeSlot: "10:20-10:30", jpLabel: "ISTIRAHAT", slotType: "istirahat", subjectName: "ISTIRAHAT", teacherName: null },
      { timeSlot: "10:30-11:05", jpLabel: "JP 5", slotType: "academic", subjectName: "ART Digital", teacherName: null },
      { timeSlot: "11:05-11:40", jpLabel: "JP 6", slotType: "academic", subjectName: "ART Digital", teacherName: null },
      { timeSlot: "11:40-13:00", jpLabel: "ISHOMA", slotType: "ishoma", subjectName: "ISHOMA", teacherName: null },
      { timeSlot: "13:00-13:35", jpLabel: "JP 7", slotType: "special", subjectName: "Guru Tamu", teacherName: null },
    ],
    Jumat: [
      { timeSlot: "07:30-08:00", jpLabel: "Pembiasaan", slotType: "pembiasaan", subjectName: "Tadarus (Surat Yasin)", teacherName: null },
      { timeSlot: "08:00-08:35", jpLabel: "JP 1", slotType: "academic", subjectName: "PAI", teacherName: "Pak Afrizal" },
      { timeSlot: "08:35-09:10", jpLabel: "JP 2", slotType: "academic", subjectName: "PAI", teacherName: "Pak Afrizal" },
      { timeSlot: "09:10-09:45", jpLabel: "JP 3", slotType: "academic", subjectName: "PKN", teacherName: "Pak Feisal" },
      { timeSlot: "09:45-10:20", jpLabel: "JP 4", slotType: "academic", subjectName: "PKN", teacherName: "Pak Feisal" },
      { timeSlot: "10:20-10:30", jpLabel: "ISTIRAHAT", slotType: "istirahat", subjectName: "ISTIRAHAT", teacherName: null },
      { timeSlot: "10:30-11:05", jpLabel: "JP 5", slotType: "academic", subjectName: "Lit.Digital", teacherName: "Bu Tinuk" },
      { timeSlot: "11:05-11:40", jpLabel: "JP 6", slotType: "academic", subjectName: "Lit.Digital", teacherName: "Bu Tinuk" },
      { timeSlot: "11:40-13:00", jpLabel: "ISHOMA", slotType: "ishoma", subjectName: "ISHOMA", teacherName: null },
      { timeSlot: "13:00-13:35", jpLabel: "JP 7", slotType: "special", subjectName: "Ekskul Kesenian", teacherName: null },
    ]
  }
};

export async function runScheduleSeed() {
  console.log("Seeding Schedule Slots...");
  const activeYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  if (!activeYear) {
    console.error("No active AcademicYear found. Please ensure an active academic year exists before seeding schedules.");
    return { inserted: 0, updated: 0, error: "No active AcademicYear" };
  }

  let inserted = 0;
  let updated = 0;

  for (const [classLevelStr, days] of Object.entries(SCHEDULE_DATA)) {
    const classLevel = Number(classLevelStr);

    for (const [day, slots] of Object.entries(days)) {
      for (const slot of slots) {
        // Attempt to link teacher if teacherName is provided
        let teacherId: number | null = null;
        if (slot.teacherName) {
          const teacher = await prisma.teacher.findFirst({
            where: { name: { equals: slot.teacherName, mode: "insensitive" } }
          });
          if (teacher) {
            teacherId = teacher.id;
          }
        }

        const isConfirmed = false;
        
        // Use UPSERT
        const existing = await prisma.scheduleSlot.findFirst({
          where: {
            academicYearId: activeYear.id,
            classLevel,
            day,
            timeSlot: slot.timeSlot
          }
        });

        if (existing) {
          await prisma.scheduleSlot.update({
            where: { id: existing.id },
            data: {
              jpLabel: slot.jpLabel,
              slotType: slot.slotType,
              subjectName: slot.subjectName,
              teacherName: slot.teacherName,
              teacherId,
              isConfirmed,
              confirmationDeadline: DEADLINE
            }
          });
          updated++;
        } else {
          await prisma.scheduleSlot.create({
            data: {
              academicYearId: activeYear.id,
              classLevel,
              day,
              timeSlot: slot.timeSlot,
              jpLabel: slot.jpLabel,
              slotType: slot.slotType,
              subjectName: slot.subjectName,
              teacherName: slot.teacherName,
              teacherId,
              isConfirmed,
              confirmationDeadline: DEADLINE
            }
          });
          inserted++;
        }
      }
    }
  }

  console.log(`Schedule Slot Seeding Complete! Inserted: ${inserted}, Updated: ${updated}`);
  return { inserted, updated };
}

// Allow direct execution
if (require.main === module) {
  runScheduleSeed()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
