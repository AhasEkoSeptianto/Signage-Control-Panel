"use client";

import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { SignageShell } from "@/components/layout/SignageShell";

export default function ClientSimulatorPage() {
  const { status, logs } = useWebSocket();

  // Simulated Display State
  const [currentMediaUrl, setCurrentMediaUrl] = useState<string>(
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
  );
  const [currentMediaTitle, setCurrentMediaTitle] = useState<string>("Video Promo Diskon Spesial");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [showOSD, setShowOSD] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to WebSocket commands that might target this client or broadcast
  useEffect(() => {
    if (logs.length > 0) {
      const latest = logs[0];
      if (latest.data && typeof latest.data === "object") {
        const payload = latest.data as any;
        if (payload.args?.url) {
          setCurrentMediaUrl(payload.args.url);
          setCurrentMediaTitle(payload.args.title || "Konten Live Pushed");
        }
      }
    }
  }, [logs]);

  return (
    <SignageShell wsStatus={status}>
      <div className="flex flex-col w-full gap-space-lg">
        {/* Header Overview */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container p-gutter-md rounded-xl shadow-sm border border-surface-variant/30">
          <div>
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[24px]">
                desktop_windows
              </span>
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
                Client Simulator (Virtual Display Node)
              </h1>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Simulasi tampilan layar TV signage digital secara langsung di browser. Setiap perintah
              push video dari halaman Konten akan langsung diputar di layar ini.
            </p>
          </div>

          <div className="flex items-center gap-space-sm">
            <span className="font-code-sm text-code-sm text-secondary bg-surface-container-high px-space-sm py-1 rounded-full border border-surface-variant flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              NODE::VIRTUAL-SIM
            </span>
            <button
              onClick={() => setShowOSD(!showOSD)}
              className="px-3 py-1 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-variant font-label-sm text-label-sm flex items-center gap-1 transition-colors border border-surface-variant/40"
            >
              <span className="material-symbols-outlined text-[16px]">
                {showOSD ? "visibility" : "visibility_off"}
              </span>
              <span>OSD Overlay</span>
            </button>
          </div>
        </div>

        {/* Virtual Digital Signage Display Frame */}
        <div className="w-full max-w-5xl mx-auto">
          {/* Simulated Physical TV Bezel */}
          <div className="bg-slate-900 p-3 sm:p-5 rounded-2xl shadow-2xl border-4 border-slate-800 relative">
            {/* Screen Inner (16:9 Aspect Ratio) */}
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-inner flex items-center justify-center">
              {currentMediaUrl ? (
                <video
                  key={currentMediaUrl}
                  src={currentMediaUrl}
                  autoPlay
                  loop
                  muted={isMuted}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[64px] text-outline mb-2">
                    tv_off
                  </span>
                  <p className="font-headline-md text-headline-md text-on-surface font-semibold">
                    Standby Display Mode
                  </p>
                  <p className="font-body-sm text-body-sm text-outline">
                    Menunggu payload media dari Command Dispatcher...
                  </p>
                </div>
              )}

              {/* Top On-Screen Display (OSD) Overlay */}
              {showOSD && (
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between pointer-events-none transition-all">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-primary-container/80 backdrop-blur-md flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-[16px]">tv</span>
                    </div>
                    <div>
                      <span className="font-label-md text-label-md text-white font-semibold drop-shadow">
                        SignageHub Player
                      </span>
                      <span className="block font-code-sm text-code-sm text-primary font-mono text-[11px] drop-shadow">
                        Node: DEV-01 [HDMI-1]
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="bg-surface-dim/80 backdrop-blur-md text-tertiary font-code-sm text-code-sm px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5 border border-tertiary/20">
                      <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                      1080p // 60 FPS
                    </span>
                    <span className="bg-surface-dim/80 backdrop-blur-md text-white font-headline-sm text-headline-sm px-3 py-1 rounded-lg font-mono">
                      {currentTime}
                    </span>
                  </div>
                </div>
              )}

              {/* Bottom OSD Ticker */}
              {showOSD && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between text-white pointer-events-none">
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-secondary text-[18px]">
                      play_circle
                    </span>
                    <span className="font-label-md text-label-md truncate font-medium">
                      Sedang Tayang: {currentMediaTitle}
                    </span>
                  </div>
                  <span className="font-code-sm text-code-sm text-outline font-mono text-[11px] shrink-0">
                    STATUS::SYNC_OK (TLS 1.3)
                  </span>
                </div>
              )}

              {/* Screen Controls Hover Panel */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 hover:opacity-100 transition-opacity bg-surface-dim/80 backdrop-blur-md p-1 rounded-lg">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 text-white hover:text-primary transition-colors"
                  title={isMuted ? "Unmute Audio" : "Mute Audio"}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isMuted ? "volume_off" : "volume_up"}
                  </span>
                </button>
              </div>
            </div>

            {/* TV Logo in bottom bezel */}
            <div className="flex items-center justify-center pt-2 text-slate-500 font-mono text-[10px] tracking-widest uppercase">
              SignageHub Smart Commercial Display 55"
            </div>
          </div>
        </div>

        {/* Quick Testing Controls & Telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md max-w-5xl mx-auto w-full">
          {/* Quick Preset Selector */}
          <div className="bg-surface-container rounded-xl p-space-md flex flex-col gap-space-sm border border-surface-variant/30">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                play_arrow
              </span>
              <span>Uji Coba Tampilan Langsung</span>
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Klik salah satu video di bawah untuk menguji pemutaran player:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => {
                  setCurrentMediaUrl(
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                  );
                  setCurrentMediaTitle("Video Promo Diskon Spesial");
                }}
                className="px-space-md py-2 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-label-md transition-colors border border-surface-variant/40"
              >
                Promo Spesial
              </button>
              <button
                onClick={() => {
                  setCurrentMediaUrl(
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
                  );
                  setCurrentMediaTitle("Company Profile 4K Showcase");
                }}
                className="px-space-md py-2 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-label-md transition-colors border border-surface-variant/40"
              >
                Company Profile 4K
              </button>
              <button
                onClick={() => {
                  setCurrentMediaUrl(
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                  );
                  setCurrentMediaTitle("Menu Seasonal Video Teaser");
                }}
                className="px-space-md py-2 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-label-md transition-colors border border-surface-variant/40"
              >
                Menu Seasonal
              </button>
            </div>
          </div>

          {/* Telemetry Strip */}
          <div className="bg-surface-container rounded-xl p-space-md flex flex-col justify-between border border-surface-variant/30">
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[18px]">memory</span>
                <span>Hardware Telemetry Player</span>
              </h3>
              <div className="grid grid-cols-3 gap-2 mt-3 font-code-sm text-code-sm">
                <div className="bg-surface-container-high p-2 rounded border border-surface-variant/30">
                  <span className="text-outline block text-[11px]">CPU Usage</span>
                  <span className="text-tertiary font-bold">14.2%</span>
                </div>
                <div className="bg-surface-container-high p-2 rounded border border-surface-variant/30">
                  <span className="text-outline block text-[11px]">RAM Buffer</span>
                  <span className="text-secondary font-bold">384 MB</span>
                </div>
                <div className="bg-surface-container-high p-2 rounded border border-surface-variant/30">
                  <span className="text-outline block text-[11px]">Temp Core</span>
                  <span className="text-primary font-bold">42°C</span>
                </div>
              </div>
            </div>
            <div className="text-outline font-code-sm text-code-sm text-[11px] mt-2">
              Decoder: Intel QuickSync / NVIDIA NVDEC H.264
            </div>
          </div>
        </div>
      </div>
    </SignageShell>
  );
}
