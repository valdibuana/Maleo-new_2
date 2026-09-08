import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, Info, LogIn, X } from 'lucide-react';
import { apiService } from '@/services/apiService';

interface TeacherCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TeacherCheckinModal({ isOpen, onClose, onSuccess }: TeacherCheckinModalProps) {
  const [form, setForm] = useState({ status: 'hadir', note: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
      const timer = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckin = async () => {
    if (form.status !== 'hadir' && !form.note) {
      alert('Keterangan wajib diisi untuk Izin/Sakit');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiService.create('/teacher-attendances/checkin', form);
      onSuccess();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal check-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand/10 text-brand mb-4">
              <Clock size={24} />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Absensi Hari Ini</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Silakan catat kehadiran Anda sebelum mulai mengajar.
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <div className="bg-slate-50 px-6 py-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
              <Clock size={20} className="text-brand animate-pulse" />
              <span className="text-2xl font-black text-brand tracking-wider font-mono tabular-nums">
                {timeStr}
              </span>
              <span className="text-sm font-bold text-slate-400">WIB</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">
                Pilih Status Kehadiran
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setForm({ ...form, status: 'hadir' })}
                  className={`py-3 rounded-xl font-semibold transition-all border-2 ${
                    form.status === 'hadir'
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <CheckCircle size={18} className="mx-auto mb-1" />
                  Hadir
                </button>
                <button
                  onClick={() => setForm({ ...form, status: 'izin' })}
                  className={`py-3 rounded-xl font-semibold transition-all border-2 ${
                    form.status === 'izin'
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Info size={18} className="mx-auto mb-1" />
                  Izin
                </button>
                <button
                  onClick={() => setForm({ ...form, status: 'sakit' })}
                  className={`py-3 rounded-xl font-semibold transition-all border-2 ${
                    form.status === 'sakit'
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <AlertCircle size={18} className="mx-auto mb-1" />
                  Sakit
                </button>
              </div>
            </div>

            {(form.status === 'izin' || form.status === 'sakit') && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Keterangan (Wajib)
                </label>
                <textarea
                  required
                  rows={2}
                  className="w-full border border-slate-200 p-3 rounded-xl resize-none focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
                  placeholder="Tuliskan keterangan detail..."
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                ></textarea>
              </div>
            )}

            <button
              onClick={handleCheckin}
              disabled={isSubmitting || ((form.status === 'izin' || form.status === 'sakit') && !form.note.trim())}
              className="w-full py-3.5 rounded-xl bg-brand text-white font-bold shadow-md hover:bg-brand/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <LogIn size={18} />
                  Simpan Kehadiran
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
