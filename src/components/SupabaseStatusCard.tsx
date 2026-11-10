"use client";

import { useEffect, useState } from "react";
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Key } from "lucide-react";

export function SupabaseStatusCard() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/supabase/health");
      const json = await res.json();
      setStatus(json);
    } catch (err: any) {
      setStatus({ status: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const isConnected = status?.status === "connected";
  const isUnconfigured = status?.status === "unconfigured";

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-400" />
          <h2 className="font-semibold text-slate-100 text-sm">Status Database Supabase</h2>
        </div>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-all disabled:opacity-50"
          title="Refresh status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" /> Supabase Terhubung & Siap
            </span>
          ) : isUnconfigured ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
              <AlertTriangle className="w-4 h-4" /> Kredensial Supabase Belum Diisi
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
              <AlertTriangle className="w-4 h-4" /> Perlu Menjalankan Skema SQL
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {status?.message || "Memeriksa status integrasi Supabase..."}
        </p>

        {status?.hint && (
          <p className="text-xs text-amber-300/90 bg-amber-950/20 p-2.5 rounded-lg border border-amber-800/40">
            💡 {status.hint}
          </p>
        )}

        <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1 font-mono">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Key className="w-3 h-3 text-slate-400" /> Schema File:
            </span>
            <span className="text-slate-300">supabase/schema.sql</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Environment File:</span>
            <span className="text-slate-300">.env.local</span>
          </div>
        </div>
      </div>
    </div>
  );
}
