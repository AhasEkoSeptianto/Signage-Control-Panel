"use client";

import { ClientInfo } from "@/types/websocket";
import { Monitor, Cpu, HardDrive, Clock, CheckCircle2 } from "lucide-react";

interface DeviceCardProps {
  device: ClientInfo;
  telemetry?: {
    cpuUsage?: number;
    memoryUsage?: { usedMb: number; totalMb: number };
    uptimeSeconds?: number;
    status?: string;
  };
  isSelected: boolean;
  onSelect: () => void;
}

export function DeviceCard({ device, telemetry, isSelected, onSelect }: DeviceCardProps) {
  const meta = device.deviceMeta;
  const platformName = meta?.platform === "win32" ? "Windows" : meta?.platform === "darwin" ? "macOS" : meta?.platform || "Desktop";

  const memPercent = telemetry?.memoryUsage
    ? Math.round((telemetry.memoryUsage.usedMb / telemetry.memoryUsage.totalMb) * 100)
    : null;

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? "border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/10"
          : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100 text-sm">{meta?.deviceName || device.id}</h3>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              ID: {device.id} • {platformName} ({meta?.arch || "x64"})
            </p>
          </div>
        </div>
        {isSelected && (
          <span className="text-emerald-400 text-xs flex items-center gap-1 font-medium bg-emerald-500/10 px-2 py-1 rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5" /> Terpilih
          </span>
        )}
      </div>

      {/* Real-time Telemetry Section */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400" /> CPU
            </span>
            <span className="font-mono text-slate-200">
              {telemetry?.cpuUsage !== undefined ? `${telemetry.cpuUsage}%` : "—"}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-500"
              style={{ width: `${telemetry?.cpuUsage || 0}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" /> RAM
            </span>
            <span className="font-mono text-slate-200">
              {memPercent !== null ? `${memPercent}%` : "—"}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${memPercent || 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" /> Terhubung:{" "}
          {new Date(device.connectedAt).toLocaleTimeString()}
        </span>
        <span className="text-slate-400 font-mono">v{meta?.appVersion || "1.0.0"}</span>
      </div>
    </div>
  );
}
