"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { HubSidebar } from "@/components/hub/HubSidebar";
import { Topbar } from "@/components/ui/Topbar";
import { cn } from "@/lib/utils";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [role, setRole] = useState<string>("student");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setRole(user.role);
      } catch (e) {}
    }
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isAdminOrPrincipal = role === "admin" || role === "kepala_sekolah";

  return (
    <div className="min-h-screen bg-background">
      {isAdminOrPrincipal ? (
        <Sidebar collapsed={isCollapsed} setCollapsed={setIsCollapsed} />
      ) : (
        <HubSidebar />
      )}

      <div
        className={cn(
          "transition-all duration-300",
          isAdminOrPrincipal ? (isCollapsed ? "pl-[72px]" : "pl-64") : "pl-64"
        )}
      >
        <Topbar />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
