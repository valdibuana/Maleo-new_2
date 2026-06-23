"use client";

import React from "react";
import { ConnectSidebar } from "@/components/connect/ConnectSidebar";
import { Topbar } from "@/components/ui/Topbar";

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <ConnectSidebar />
      <div className="pl-64 transition-all duration-300">
        <Topbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
