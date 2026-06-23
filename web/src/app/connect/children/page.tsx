"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiService } from "@/services/apiService";
import { Users, GraduationCap, Hash, Loader2, UserX } from "lucide-react";

export default function ChildrenPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await apiService.getAll("/connect/children");
        setChildren(res.data || []);
      } catch (error) {
        console.error("Gagal mengambil data anak", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Data Anak</h1>
        <p className="text-muted-foreground">
          Daftar siswa yang terhubung dengan akun wali murid Anda.
        </p>
      </div>

      {children.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center gap-4">
          <div className="p-5 rounded-full bg-brand/10 text-brand-light">
            <UserX size={40} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1 tracking-tight font-bold">
              Belum ada anak yang terhubung
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Hubungi admin sekolah untuk menghubungkan akun Anda dengan data
              siswa.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {children.map((child: any) => (
            <Card
              key={child.id}
              className="p-6 border border-border hover:shadow-lg transition-shadow duration-200"
            >
              {/* Avatar & Nama */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-light to-brand flex items-center justify-center text-white font-bold text-2xl shadow-md shadow-amber-200">
                  {child.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-lg text-foreground leading-tight truncate tracking-tight">
                    {child.name}
                  </h2>
                  <Badge variant="neutral" className="mt-1">
                    Aktif
                  </Badge>
                </div>
              </div>

              {/* Info Grid */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Hash size={16} className="text-brand shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      NIS
                    </p>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {child.nis}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <GraduationCap size={16} className="text-brand shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Kelas
                    </p>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {child.class?.name ?? "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Users size={16} className="text-rose-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      ID Siswa
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      #{child.id}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
