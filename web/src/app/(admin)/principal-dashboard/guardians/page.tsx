"use client";

import React, { useState, useEffect } from "react";
import { Search, Users, Loader2, RefreshCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { apiService } from "@/services/apiService";

interface Guardian {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  occupation: string;
  userCode: string | null;
  children: { id: number; name: string; className: string }[];
}

export default function GuardiansPage() {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const fetchGuardians = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAll("/guardians");
      setGuardians(response.data);
    } catch (err: any) {
      setError("Gagal mengambil data wali murid");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuardians();
  }, []);

  const filtered = guardians.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Data Wali Murid</h1>
          <p className="text-sm text-muted-foreground mt-1">Pantau data orang tua/wali murid</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchGuardians}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-6">
          <Input placeholder="Cari nama atau telepon..." icon={<Search size={16} />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Memuat data...</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">No</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Wali Murid</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Kode Login</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Telepon</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Pekerjaan</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Anak</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((guardian, i) => (
                  <tr key={guardian.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground">{i + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={guardian.name} size="sm" />
                        <div>
                          <p className="font-medium text-foreground">{guardian.name}</p>
                          <p className="text-xs text-muted-foreground">{guardian.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-brand">{guardian.userCode || '-'}</td>
                    <td className="py-3 px-4 text-muted-foreground">{guardian.phone}</td>
                    <td className="py-3 px-4">{guardian.occupation}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        {guardian.children && guardian.children.length > 0 ? (
                          guardian.children.map((child) => (
                            <div key={child.id} className="flex items-center gap-2">
                              <Badge variant="info">{child.name}</Badge>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Belum ada</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
