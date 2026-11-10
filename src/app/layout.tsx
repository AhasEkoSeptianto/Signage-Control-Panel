import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MJS Hub - Next.js + WebSocket + Electron + Supabase",
  description: "Arsitektur modern menghubungkan Next.js Web Dashboard dengan Electron Desktop via WebSocket & Supabase Database",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
