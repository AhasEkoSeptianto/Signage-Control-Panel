"use client";

import { SignageSidebar } from "./SignageSidebar";
import { SignageHeader } from "./SignageHeader";

interface SignageShellProps {
  children: React.ReactNode;
  wsStatus?: "connected" | "connecting" | "disconnected" | "error";
  wsUrl?: string;
  supabaseConnected?: boolean;
}

export function SignageShell({
  children,
  wsStatus = "connected",
  wsUrl,
  supabaseConnected = true,
}: SignageShellProps) {
  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen">
      <SignageSidebar supabaseConnected={supabaseConnected} />
      <div className="pl-64">
        <SignageHeader wsStatus={wsStatus} wsUrl={wsUrl} />
        <main className="w-full pt-16 min-h-screen bg-surface px-margin-md py-space-lg">
          {children}
        </main>
      </div>
    </div>
  );
}
