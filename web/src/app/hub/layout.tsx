"use client";

import React from "react";
import { HubSidebar } from "@/components/hub/HubSidebar";
import { Topbar } from "@/components/ui/Topbar";

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <HubSidebar />
      <div className="pl-64 transition-all duration-300">
        <Topbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
