"use client";

import { useState } from "react";
import { Send, Globe, Bell, Activity, Terminal, Code2 } from "lucide-react";
import { DesktopCommandPayload } from "@/types/websocket";

interface CommandPanelProps {
  selectedDeviceId: string | null;
  onSendCommand: (
    deviceId: string,
    command: DesktopCommandPayload["command"],
    args?: Record<string, unknown>
  ) => void;
}

export function CommandPanel({ selectedDeviceId, onSendCommand }: CommandPanelProps) {
  const [activeTab, setActiveTab] = useState<"OPEN_URL" | "NOTIFY" | "GET_SYSTEM_INFO" | "CUSTOM_ACTION">("OPEN_URL");
  const [url, setUrl] = useState("https://google.com");
  const [notifyTitle, setNotifyTitle] = useState("Pesan dari Next.js");
  const [notifyBody, setNotifyBody] = useState("Halo dari web dashboard!");
  const [customActionName, setCustomActionName] = useState("TRIGGER_TASK");
  const [customJsonArgs, setCustomJsonArgs] = useState('{\n  "priority": "high",\n  "message": "Hello from custom payload"\n}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleSend = () => {
    if (!selectedDeviceId) return;

    if (activeTab === "OPEN_URL") {
      onSendCommand(selectedDeviceId, "OPEN_URL", { url });
    } else if (activeTab === "NOTIFY") {
      onSendCommand(selectedDeviceId, "NOTIFY", { title: notifyTitle, body: notifyBody });
    } else if (activeTab === "GET_SYSTEM_INFO") {
      onSendCommand(selectedDeviceId, "GET_SYSTEM_INFO");
    } else if (activeTab === "CUSTOM_ACTION") {
      try {
        const parsed = JSON.parse(customJsonArgs);
        setJsonError(null);
        onSendCommand(selectedDeviceId, "CUSTOM_ACTION", {
          actionName: customActionName,
          ...parsed,
        });
      } catch (err: any) {
        setJsonError("Format JSON tidak valid: " + err.message);
      }
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-slate-100 text-sm">Pusat Eksekusi Perintah Desktop</h2>
        </div>
        {selectedDeviceId ? (
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
            Target: {selectedDeviceId}
          </span>
        ) : (
          <span className="text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
            Pilih perangkat di atas dahulu
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3 mb-4">
        <button
          onClick={() => setActiveTab("OPEN_URL")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "OPEN_URL"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Globe className="w-3.5 h-3.5" /> Buka URL di Desktop
        </button>
        <button
          onClick={() => setActiveTab("NOTIFY")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "NOTIFY"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bell className="w-3.5 h-3.5" /> Kirim Notifikasi Native
        </button>
        <button
          onClick={() => setActiveTab("GET_SYSTEM_INFO")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "GET_SYSTEM_INFO"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> Info Hardware
        </button>
        <button
          onClick={() => setActiveTab("CUSTOM_ACTION")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "CUSTOM_ACTION"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Code2 className="w-3.5 h-3.5" /> Payload JSON Kustom
        </button>
      </div>

      {/* Tab Contents */}
      <div className="space-y-3">
        {activeTab === "OPEN_URL" && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              URL yang akan dibuka di browser default OS Desktop:
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        )}

        {activeTab === "NOTIFY" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Judul Notifikasi:</label>
              <input
                type="text"
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
                placeholder="Judul notifikasi..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Isi Pesan:</label>
              <input
                type="text"
                value={notifyBody}
                onChange={(e) => setNotifyBody(e.target.value)}
                placeholder="Isi pesan notifikasi..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {activeTab === "GET_SYSTEM_INFO" && (
          <p className="text-xs text-slate-400 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
            Perintah ini akan meminta Electron desktop mengekstrak data hostname, CPU core count, total RAM, dan OS release dari modul native Node.js / Electron, lalu mengirimkannya kembali ke web dashboard via WebSocket.
          </p>
        )}

        {activeTab === "CUSTOM_ACTION" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Nama Aksi Kustom:</label>
              <input
                type="text"
                value={customActionName}
                onChange={(e) => setCustomActionName(e.target.value)}
                placeholder="misal: SYNC_DATA, PRINT_RECEIPT, RESTART_APP"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Payload JSON (Parameter):</label>
              <textarea
                value={customJsonArgs}
                onChange={(e) => setCustomJsonArgs(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-emerald-300 focus:outline-none focus:border-indigo-500 font-mono"
              />
              {jsonError && <p className="text-xs text-rose-400 mt-1">{jsonError}</p>}
            </div>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={!selectedDeviceId}
          className={`w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
            selectedDeviceId
              ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 active:scale-[0.99]"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          <Send className="w-4 h-4" />
          Kirim Perintah ke Desktop Electron
        </button>
      </div>
    </div>
  );
}
