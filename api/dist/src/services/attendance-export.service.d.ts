interface StudentAttendanceData {
    no: number;
    nis: string;
    name: string;
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
}
interface TeacherAttendanceData {
    no: number;
    nama: string;
    mapel: string;
    m1: number | string;
    m2: number | string;
    m3: number | string;
    m4: number | string;
}
export declare class AttendanceExportService {
    private static thinBorders;
    private static autoFitColumns;
    static generateStudentAttendanceExcel(classLevel: string, startDate: string, endDate: string, data: StudentAttendanceData[]): Promise<Buffer>;
    static generateTeacherAttendanceExcel(monthName: string, year: number, semester: string, data: TeacherAttendanceData[]): Promise<Buffer>;
}
export {};
//# sourceMappingURL=attendance-export.service.d.ts.map