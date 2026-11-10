"use client";

import { LogEntry } from "@/hooks/use-websocket";
import { Terminal, Trash2 } from "lucide-react";

interface ActivityLogProps {
  logs: LogEntry[];
  onClear?: () => void;
}

export function ActivityLog({ logs }: ActivityLogProps) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col h-[340px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h2 className="font-semibold text-slate-100 text-sm">Real-Time Event & WebSocket Log</h2>
        </div>
        <span className="text-xs font-mono text-slate-400">{logs.length} events</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 text-xs">
            Menunggu aktivitas event atau pesan WebSocket...
          </div>
        ) : (
          logs.map((log) => {
            const isError = log.type === "ERROR" || log.type === "AUTH_ERROR";
            const isResult = log.type === "COMMAND_RESULT" || log.type === "DESKTOP_COMMAND_RESULT";
            const isAck = log.type === "COMMAND_ACK" || log.type === "AUTH_SUCCESS";

            return (
              <div
                key={log.id}
                className={`p-2.5 rounded-lg border ${
                  isError
                    ? "bg-rose-950/20 border-rose-800/40 text-rose-300"
                    : isResult
                    ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                    : isAck
                    ? "bg-blue-950/20 border-blue-800/40 text-blue-300"
                    : "bg-slate-950 border-slate-800 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] opacity-75 mb-1">
                  <span className="font-bold tracking-wider">{log.type}</span>
                  <span>{log.timestamp}</span>
                </div>
                <div className="text-xs font-sans text-slate-200">{log.summary}</div>
                {log.data ? (
                  <pre className="mt-1.5 p-1.5 bg-slate-950/90 rounded border border-slate-800/60 text-[10px] text-slate-400 overflow-x-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
