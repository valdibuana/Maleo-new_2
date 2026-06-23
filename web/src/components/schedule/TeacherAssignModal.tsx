import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";

interface TeacherAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: any | null;
  teachers: any[];
  onSave: (teacherId: number, isConfirmed: boolean) => Promise<void>;
}

export function TeacherAssignModal({ isOpen, onClose, slot, teachers, onSave }: TeacherAssignModalProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    slot?.teacherId ? String(slot.teacherId) : ""
  );
  const [isConfirmed, setIsConfirmed] = useState<boolean>(slot?.isConfirmed || false);
  const [loading, setLoading] = useState(false);

  // Update local state when slot changes
  React.useEffect(() => {
    if (slot) {
      setSelectedTeacherId(slot.teacherId ? String(slot.teacherId) : "");
      setIsConfirmed(slot.isConfirmed || false);
    }
  }, [slot]);

  const handleSave = async () => {
    if (!selectedTeacherId) return;
    setLoading(true);
    try {
      await onSave(Number(selectedTeacherId), isConfirmed);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!slot) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tetapkan Guru Pengajar">
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-xs font-bold text-slate-500 uppercase">Detail Slot</p>
          <div className="mt-1">
            <span className="font-bold">{slot.day}, {slot.timeSlot}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="font-medium">{slot.subjectName}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-brand">Kelas {slot.classLevel}</span>
          </div>
        </div>

        <div>
          <Select
            label="Pilih Guru"
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            options={teachers.map(t => ({ value: String(t.id), label: t.name }))}
            placeholder="Pilih guru pengajar"
          />
        </div>

        <div className="flex items-center gap-2 mt-2 p-3 border border-slate-200 rounded-lg bg-white">
          <input
            type="checkbox"
            id="isConfirmed"
            checked={isConfirmed}
            onChange={(e) => setIsConfirmed(e.target.checked)}
            className="w-4 h-4 text-brand rounded border-slate-300 focus:ring-brand"
          />
          <label htmlFor="isConfirmed" className="text-sm font-medium text-slate-700 cursor-pointer">
            Tandai Sudah Konfirmasi
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={loading || !selectedTeacherId}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
            ) : (
              "Simpan"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
