export interface User {
  id: number;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "teacher" | "student" | "guardian";
  avatar?: string;
}

export interface Student {
  id: number;
  nis: string;
  name: string;
  gender: "L" | "P";
  birthDate: string;
  address: string;
  phone: string;
  gradeId: number;
  gradeName: string;
  status: "active" | "inactive";
  guardianId?: number;
  guardianName?: string;
  userCode?: string;
}

export interface Teacher {
  userCode?: string;
  id: number;
  nip: string;
  name: string;
  gender: "L" | "P";
  email: string;
  phone: string;
  subject: string;
  subjects?: any[];
  status: "active" | "inactive";
}

export interface Guardian {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  occupation: string;
  children: { id: number; name: string; grade: string }[];
}

export interface AcademicYear {
  id: number;
  name: string;
  semester: "Ganjil" | "Genap";
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Grade {
  id: number;
  name: string;
  level: number;
  group: string;
  homeroomTeacher: string;
  homeroomTeacherId: number;
  studentCount: number;
}

export interface Subject {
  id: number;
  code: string;
  name: string;
  teacherId: number;
  teacherName: string;
  gradeLevel: number;
  hoursPerWeek: number;
}

export interface Schedule {
  id: number;
  day: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  gradeName: string;
  room: string;
}

export interface Attendance {
  id: number;
  studentId: number;
  studentName: string;
  gradeName: string;
  date: string;
  status: "hadir" | "izin" | "sakit" | "alpa";
  note?: string;
}

export interface Score {
  id: number;
  studentId: number;
  studentName: string;
  gradeName: string;
  subjectName: string;
  type: "Tugas" | "PSTS" | "PSAS" | "Kuis";
  score: number;
  maxScore: number;
  date: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  author: string;
  target: "all" | "teacher" | "student" | "guardian";
  priority: "normal" | "important" | "urgent";
  createdAt: string;
  isPublished: boolean;
}
