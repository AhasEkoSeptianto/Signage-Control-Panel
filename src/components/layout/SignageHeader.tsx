"use client";

import Link from "next/link";
import { useState } from "react";

interface SignageHeaderProps {
  wsStatus?: "connected" | "connecting" | "disconnected" | "error";
  wsUrl?: string;
}

export function SignageHeader({
  wsStatus = "connected",
  wsUrl = "ws://localhost:3000/ws",
}: SignageHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  const isWsConnected = wsStatus === "connected";

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-surface/80 backdrop-blur-xl z-40 flex items-center justify-between px-gutter-md shadow-[0_1px_8px_rgba(0,0,0,0.08)] border-b border-surface-variant/40">
      {/* Left Status Badges */}
      <div className="flex items-center gap-space-md">
        <div className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-surface-container-high">
          <span className="material-symbols-outlined text-secondary text-[16px]">shield</span>
          <span className="font-code-sm text-code-sm text-secondary font-medium">Admin: JWT Valid</span>
        </div>

        <div className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-surface-container-high">
          <span
            className={`w-2 h-2 rounded-full ${
              isWsConnected ? "bg-tertiary animate-pulse" : "bg-error"
            }`}
          />
          <span
            className={`font-code-sm text-code-sm ${
              isWsConnected ? "text-tertiary" : "text-error"
            }`}
          >
            WebSocket: {isWsConnected ? "Connected" : wsStatus}
          </span>
        </div>
      </div>

      {/* Right User & Actions */}
      <div className="flex items-center gap-space-md relative">
        <div className="hidden sm:flex items-center gap-2 text-right">
          <span className="font-label-md text-label-md text-on-surface font-semibold">Admin Pusat</span>
          <span className="font-code-sm text-code-sm text-outline">admin@signagehub.id</span>
        </div>

        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary-container"
          aria-label="User Profile"
        >
          <span className="material-symbols-outlined text-[18px]">person</span>
        </button>

        {/* Profile Dropdown */}
        {profileOpen && (
          <div className="absolute right-0 top-12 w-52 bg-surface-container rounded-xl shadow-2xl p-space-xs border border-surface-variant z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-space-sm border-b border-surface-variant">
              <p className="font-label-md text-label-md text-on-surface font-semibold">Admin Fleet</p>
              <p className="font-code-sm text-code-sm text-on-surface-variant">admin@signagehub.id</p>
            </div>
            <div className="py-1">
              <Link
                href="/login"
                className="flex items-center gap-2 px-space-sm py-2 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                onClick={() => setProfileOpen(false)}
              >
                <span className="material-symbols-outlined text-[16px]">switch_account</span>
                <span>Masuk Akun Lain</span>
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-2 px-space-sm py-2 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                onClick={() => setProfileOpen(false)}
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>Registrasi Admin</span>
              </Link>
            </div>
            <div className="p-space-xs border-t border-surface-variant">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("admin_auth");
                    window.location.href = "/login";
                  }
                }}
                className="w-full flex items-center gap-2 px-space-sm py-1.5 rounded-lg text-body-sm text-error hover:bg-error-container/20 transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Keluar (Logout)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
