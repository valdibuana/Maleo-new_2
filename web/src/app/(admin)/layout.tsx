"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { Topbar } from "@/components/ui/Topbar";
import { ReadOnlyBanner } from "@/components/ui/ReadOnlyBanner";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    try {
      const user = localStorage.getItem("user");
      if (user) setUserRole(JSON.parse(user).role);
    } catch {
      // ignore parse errors
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={isCollapsed} setCollapsed={setIsCollapsed} />

      <div
        className={cn(
          "transition-all duration-300",
          isCollapsed ? "pl-[72px]" : "pl-64"
        )}
      >
        <Topbar />
        <main className="p-6">
          <ReadOnlyBanner role={userRole} />
          {children}
        </main>
      </div>
    </div>
  );
}
