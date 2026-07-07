import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maleo SIAKAD — Sistem Informasi Akademik",
  description:
    "Sistem Informasi Akademik Sekolah — Kelola data siswa, guru, jadwal, kehadiran, dan nilai secara digital.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    statusBarStyle: "default",
    title: "SIAKAD",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e7490",
};

import { Toaster } from "react-hot-toast";
import { Providers } from "@/components/Providers";
import { ConnectionBanner } from "@/components/ui/ConnectionBanner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        <Providers>
          <ConnectionBanner />
          <Toaster position="top-right" />
          {children}
        </Providers>
      </body>
    </html>
  );
}
