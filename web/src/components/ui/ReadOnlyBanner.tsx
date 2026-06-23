"use client";

import { ShieldCheck } from "lucide-react";

interface Props {
  role: string;
}

export function ReadOnlyBanner({ role }: Props) {
  if (role !== "kepala_sekolah") return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 mb-4 bg-brand/10 border border-brand/20 rounded-lg text-brand text-sm">
      <ShieldCheck size={16} className="shrink-0" />
      <span>
        Anda login sebagai <strong>Kepala Sekolah</strong> — mode baca saja.
        Perubahan data tidak dapat dilakukan.
      </span>
    </div>
  );
}
