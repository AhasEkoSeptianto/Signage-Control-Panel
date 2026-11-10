"use client";

import { useState } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { DeviceCard } from "@/components/DeviceCard";
import { CommandPanel } from "@/components/CommandPanel";
import { ActivityLog } from "@/components/ActivityLog";
import { SupabaseStatusCard } from "@/components/SupabaseStatusCard";
import {
  Monitor,
  Radio,
  Server,
  Layers,
  Terminal,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function DashboardPage() {
  const { status, electronClients, clientTelemetry, logs, sendCommand } = useWebSocket();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Auto-select first device if none selected
  const activeSelectedId =
    selectedDeviceId && electronClients.some((c) => c.id === selectedDeviceId)
      ? selectedDeviceId
      : electronClients[0]?.id || null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  MJS Hub <span className="text-xs font-normal text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">Next.js + WS + Electron + Supabase</span>
                </h1>
                <p className="text-xs md:text-sm text-slate-400">
                  Dashboard kontrol pusat, jembatan WebSocket real-time, dan orkestrasi desktop
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3.5 py-1.5 rounded-full text-xs">
              <Radio
                className={`w-3.5 h-3.5 ${
                  status === "connected"
                    ? "text-emerald-400 animate-pulse"
                    : status === "connecting"
                    ? "text-amber-400 animate-spin"
                    : "text-rose-400"
                }`}
              />
              <span className="text-slate-400">WebSocket:</span>
              <span
                className={`font-semibold ${
                  status === "connected"
                    ? "text-emerald-400"
                    : status === "connecting"
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {status === "connected" ? "Aktif (Port 3000/ws)" : status}
              </span>
            </div>
          </div>
        </header>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Next.js Server</p>
              <p className="text-base font-semibold text-slate-100">App Router (v15)</p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Electron Terhubung</p>
              <p className="text-base font-semibold text-slate-100">
                {electronClients.length} Device
              </p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Protokol WS</p>
              <p className="text-base font-semibold text-slate-100">Handshake & Token</p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Supabase Database</p>
              <p className="text-base font-semibold text-slate-100">PostgreSQL + Realtime</p>
            </div>
          </div>
        </div>

        {/* Mock Electron Banner (Helper for testing) */}
        {electronClients.length === 0 && (
          <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-800/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start md:items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-200">
                  Belum ada aplikasi Desktop Electron yang terhubung?
                </p>
                <p className="text-xs text-slate-400">
                  Buka terminal baru dan jalankan simulasi Electron client untuk menguji koneksi WebSocket & telemetry:
                </p>
              </div>
            </div>
            <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs text-indigo-300 self-start md:self-auto select-all">
              npm run mock:electron
            </div>
          </div>
        )}

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Devices & Command Dispatch (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Devices Section */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-semibold text-slate-100 text-sm">
                    Daftar Perangkat Desktop Electron Aktif ({electronClients.length})
                  </h2>
                </div>
                <span className="text-xs text-slate-400">Pilih perangkat untuk mengirim perintah</span>
              </div>

              {electronClients.length === 0 ? (
                <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800/60 flex items-center justify-center mx-auto text-slate-400">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-slate-400">
                    Menunggu koneksi dari aplikasi Electron desktop...
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Koneksikan aplikasi Electron Anda atau jalankan <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded">npm run mock:electron</code> di terminal terpisah.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {electronClients.map((client) => (
                    <DeviceCard
                      key={client.id}
                      device={client}
                      telemetry={clientTelemetry[client.id]}
                      isSelected={client.id === activeSelectedId}
                      onSelect={() => setSelectedDeviceId(client.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Command Execution Center */}
            <CommandPanel
              selectedDeviceId={activeSelectedId}
              onSendCommand={sendCommand}
            />
          </div>

          {/* Right Column: Supabase & Logs (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <SupabaseStatusCard />
            <ActivityLog logs={logs} />
          </div>
        </div>

        {/* Architecture & Documentation Footer Panel */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 text-xs text-slate-400 space-y-3">
          <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
            <Layers className="w-4 h-4 text-indigo-400" />
            Ringkasan Struktur Arsitektur MJS
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/60">
              <span className="font-semibold text-indigo-300 block mb-1">1. Next.js App Router</span>
              Fullstack web framework yang meng-host API routes, Server Components, dan Web Dashboard untuk operator.
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/60">
              <span className="font-semibold text-indigo-300 block mb-1">2. Unified WebSocket Server</span>
              Terintegrasi langsung pada `server.ts` melalui port yang sama (`/ws`), menangani handshake token, telemetry heartbeat, dan command routing.
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/60">
              <span className="font-semibold text-indigo-300 block mb-1">3. Supabase Integration</span>
              Database PostgreSQL + Realtime subscription dengan tabel `devices`, `desktop_commands`, dan `activity_logs`.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
