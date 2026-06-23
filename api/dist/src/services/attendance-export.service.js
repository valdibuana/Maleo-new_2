"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceExportService = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
class AttendanceExportService {
    static autoFitColumns(worksheet) {
        worksheet.columns.forEach(column => {
            let maxLen = 0;
            column.eachCell?.({ includeEmpty: true }, cell => {
                const len = cell.value ? cell.value.toString().length : 0;
                if (len > maxLen)
                    maxLen = len;
            });
            column.width = maxLen < 12 ? 12 : maxLen + 4;
        });
    }
    static async generateStudentAttendanceExcel(classLevel, startDate, endDate, data) {
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet('Rekap Siswa');
        // Layout Header Sesuai Screenshot Kepala Sekolah
        worksheet.mergeCells('A1:G1');
        worksheet.mergeCells('A2:G2');
        worksheet.mergeCells('A3:G3');
        worksheet.getCell('A1').value = 'Sekolah Maleo';
        worksheet.getCell('A2').value = `Rekap Kehadiran - ${classLevel.toUpperCase()}`;
        worksheet.getCell('A3').value = `Periode: ${startDate} s/d ${endDate}`;
        // Style headers
        ['A1', 'A2', 'A3'].forEach((cellId, idx) => {
            const cell = worksheet.getCell(cellId);
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { name: 'Arial', bold: true, size: idx === 0 ? 14 : 11 };
        });
        // Table Headers (Row 5)
        worksheet.getRow(5).values = ['No', 'NIS', 'Nama Siswa', 'Hadir', 'Sakit', 'Izin', 'Alpa'];
        worksheet.getRow(5).height = 25;
        for (let i = 1; i <= 7; i++) {
            const cell = worksheet.getCell(5, i);
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1591DC' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = this.thinBorders;
        }
        // Populate Data
        data.forEach((item, index) => {
            const rowIdx = 6 + index;
            worksheet.getRow(rowIdx).values = [
                item.no,
                item.nis,
                item.name,
                item.hadir,
                item.sakit,
                item.izin,
                item.alpa
            ];
            for (let i = 1; i <= 7; i++) {
                const cell = worksheet.getCell(rowIdx, i);
                cell.border = this.thinBorders;
                cell.alignment = {
                    horizontal: i === 3 ? 'left' : 'center',
                    vertical: 'middle'
                };
            }
        });
        this.autoFitColumns(worksheet);
        return (await workbook.xlsx.writeBuffer());
    }
    static async generateTeacherAttendanceExcel(monthName, year, semester, data) {
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet('Rekap Tutor');
        // Layout Header Sesuai Format File Excel Rekap Tutor
        worksheet.mergeCells('A1:F1');
        worksheet.mergeCells('A2:F2');
        worksheet.getCell('A1').value = `Rekap Mingguan Tutor PKBM Semester ${semester}`;
        worksheet.getCell('A2').value = `BULAN ${monthName.toUpperCase()} ${year}`;
        // Style headers
        ['A1', 'A2'].forEach((cellId, idx) => {
            const cell = worksheet.getCell(cellId);
            cell.font = { name: 'Arial', bold: true, size: idx === 0 ? 14 : 11 };
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
        });
        // Table Headers (Row 4)
        worksheet.getRow(4).values = ['No', 'Nama Guru (Mapel)', 'M-1', 'M-2', 'M-3', 'M-4'];
        worksheet.getRow(4).height = 25;
        for (let i = 1; i <= 6; i++) {
            const cell = worksheet.getCell(4, i);
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1591DC' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = this.thinBorders;
        }
        // Populate Data
        data.forEach((item, index) => {
            const rowIdx = 5 + index;
            worksheet.getRow(rowIdx).values = [
                item.no,
                `${item.nama} (${item.mapel})`,
                item.m1 || '',
                item.m2 || '',
                item.m3 || '',
                item.m4 || ''
            ];
            for (let i = 1; i <= 6; i++) {
                const cell = worksheet.getCell(rowIdx, i);
                cell.border = this.thinBorders;
                cell.alignment = {
                    horizontal: i === 2 ? 'left' : 'center',
                    vertical: 'middle'
                };
            }
        });
        // Legend Box Komponen Samping Sesuai Template
        worksheet.getCell('H7').value = 'Keterangan :';
        worksheet.getCell('H7').font = { bold: true };
        worksheet.getCell('H8').value = 'IZIN';
        worksheet.getCell('H9').value = 'SAKIT';
        worksheet.getCell('H10').value = 'TANPA KETERANGAN';
        worksheet.getCell('H11').value = 'KEGIATAN SEKOLAH';
        this.autoFitColumns(worksheet);
        return (await workbook.xlsx.writeBuffer());
    }
}
exports.AttendanceExportService = AttendanceExportService;
AttendanceExportService.thinBorders = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
};
//# sourceMappingURL=attendance-export.service.js.map