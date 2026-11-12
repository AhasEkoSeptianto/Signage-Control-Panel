"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { SignageShell } from "@/components/layout/SignageShell";

interface DeviceItem {
  id: string;
  lokasi: string;
  status?: string;
  current_playing?: string;
}

interface ContentMediaItem {
  id: string;
  judul: string;
  payload: string;
  tipe: string;
}

interface LogItem {
  id: string;
  time: string;
  type: "COMMAND" | "STATUS" | "AUTH" | "INFO" | "ERROR";
  summary: string;
  detail?: any;
}

export default function SimulationPage() {
  // Device & Catalog State
  const [deviceList, setDeviceList] = useState<DeviceItem[]>([]);
  const [contentList, setContentList] = useState<ContentMediaItem[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("DEV-01");
  const [activeLocation, setActiveLocation] = useState<string>("Gedung A - Lantai 1");

  // Playback & Display State
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [wsClientStatus, setWsClientStatus] = useState<"connected" | "connecting" | "disconnected">("connecting");
  const [currentTitle, setCurrentTitle] = useState<string>("Video Promo Diskon Spesial");
  const [currentDescription, setCurrentDescription] = useState<string>("Menayangkan video promo resolusi tinggi untuk signage display.");
  const [currentUrl, setCurrentUrl] = useState<string>("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isCleanMode, setIsCleanMode] = useState<boolean>(false);
  const [viewBezel, setViewBezel] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Standby input state
  const [standbyInputId, setStandbyInputId] = useState<string>("");

  // Live Toast push notification
  const [pushToast, setPushToast] = useState<{ message: string; isError?: boolean } | null>(null);

  // Quick Push Tester inside admin toolbar
  const [quickPushUrl, setQuickPushUrl] = useState<string>("");
  const [quickPushTitle, setQuickPushTitle] = useState<string>("");
  const [isSendingQuickPush, setIsSendingQuickPush] = useState<boolean>(false);

  // Inspector Logs
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [showLogs, setShowLogs] = useState<boolean>(true);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wsSimRef = useRef<WebSocket | null>(null);
  const screenWrapperRef = useRef<HTMLDivElement | null>(null);

  // Helper: Add simulator log
  const addLog = (type: LogItem["type"], summary: string, detail?: any) => {
    setLogs((prev) => [
      {
        id: `sim-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        time: new Date().toLocaleTimeString("id-ID"),
        type,
        summary,
        detail,
      },
      ...prev.slice(0, 49),
    ]);
  };

  // Helper: Trigger toast
  const triggerToast = (msg: string, isError = false) => {
    setPushToast({ message: msg, isError });
    setTimeout(() => {
      setPushToast((curr) => (curr?.message === msg ? null : curr));
    }, 4500);
  };

  // Auth guard & Query param reader
  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = localStorage.getItem("admin_auth");
      if (!auth) {
        window.location.href = "/login";
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const queryDev = params.get("deviceId");
      if (queryDev) {
        setSelectedDeviceId(queryDev.toUpperCase());
      }
    }
  }, []);

  // Fetch devices and media contents from backend
  useEffect(() => {
    fetch("/api/devices")
      .then((r) => r.json())
      .then((data) => {
        if (data.devices && Array.isArray(data.devices)) {
          const list: DeviceItem[] = data.devices.map((d: any) => ({
            id: d.id,
            lokasi: d.lokasi || d.location || "Gedung Utama",
            status: d.status,
            current_playing: d.current_playing,
          }));
          setDeviceList(list);

          // If current selectedDeviceId is in list, update activeLocation
          const matched = list.find((d) => d.id.toUpperCase() === selectedDeviceId.toUpperCase());
          if (matched) {
            setActiveLocation(matched.lokasi);
            if (matched.current_playing) {
              setCurrentTitle(matched.current_playing);
            }
          }
        }
      })
      .catch((err) => console.warn("Could not fetch devices:", err));

    fetch("/api/contents")
      .then((r) => r.json())
      .then((data) => {
        if (data.contents && Array.isArray(data.contents)) {
          const cList: ContentMediaItem[] = data.contents.map((c: any) => ({
            id: c.id,
            judul: c.judul || c.title || "Video Signage",
            payload: c.payload || c.url || "",
            tipe: c.tipe || "video",
          }));
          setContentList(cList);
          if (cList.length > 0 && !quickPushUrl) {
            setQuickPushUrl(cList[0].payload);
            setQuickPushTitle(cList[0].judul);
          }
        }
      })
      .catch(() => {});
  }, [selectedDeviceId]);

  // Establish Live WebSocket connection simulating Electron client
  useEffect(() => {
    if (typeof window === "undefined" || !isConnected || !selectedDeviceId) return;

    const defaultWsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;
    const targetWsUrl = process.env.NEXT_PUBLIC_WS_URL || defaultWsUrl;

    setWsClientStatus("connecting");
    addLog("INFO", `Menghubungkan Simulator WebSocket sebagai [${selectedDeviceId}]...`);

    const socket = new WebSocket(targetWsUrl);
    wsSimRef.current = socket;

    socket.onopen = () => {
      setWsClientStatus("connected");
      addLog("AUTH", `WebSocket terbuka, mendaftarkan Simulator sebagai Device [${selectedDeviceId}]`);

      // Register with role "electron"
      socket.send(
        JSON.stringify({
          type: "AUTH_REGISTER",
          senderId: selectedDeviceId,
          payload: {
            role: "electron",
            secretToken: process.env.NEXT_PUBLIC_WS_AUTH_SECRET || "secret_electron_handshake_token_12345",
            deviceMeta: {
              hostname: "Browser-Simulator",
              platform: "Web-Simulated-Player",
              appVersion: "2.4.0",
              isSimulator: true,
            },
          },
          timestamp: new Date().toISOString(),
        })
      );
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "AUTH_SUCCESS":
            setWsClientStatus("connected");
            setIsConnected(true);
            addLog("AUTH", `Autentikasi Sukses: Terverifikasi oleh server pusat`, msg.payload);
            triggerToast(`✓ Simulator terverifikasi sebagai [${selectedDeviceId}]`);
            break;

          case "AUTH_ERROR":
            setWsClientStatus("disconnected");
            setIsConnected(false);
            addLog("ERROR", `Pendaftaran Ditolak: ${msg.payload?.message || "Device ID tidak valid"}`, msg.payload);
            triggerToast(`❌ Ditolak Server: ${msg.payload?.message || "ID tidak terdaftar"}`, true);
            break;

          case "DESKTOP_COMMAND":
            const cmdPayload = msg.payload || {};
            const command = cmdPayload.command;
            const args = cmdPayload.args || {};
            const targetId = (msg.targetId || selectedDeviceId).toUpperCase();

            addLog("COMMAND", `Perintah diterima: ${command}`, { targetId, args });

            // 1. OPEN_URL / PLAY_MEDIA / PUSH_MEDIA
            if (command === "OPEN_URL" || command === "PLAY_MEDIA" || command === "PUSH_MEDIA") {
              const newUrl = args.url || "";
              const newTitle = args.title || "Tayangan Baru dari Admin Dashboard";
              const newDesc = args.description || `Konten push diperbarui secara real-time dari Admin Dashboard pada ${new Date().toLocaleTimeString()} WIB.`;

              if (newUrl) {
                setCurrentUrl(newUrl);
                setCurrentTitle(newTitle);
                setCurrentDescription(newDesc);
                setIsPlaying(true);
                triggerToast(`📡 Push Masuk untuk ${targetId}: ${newTitle}`);

                // Send telemetry status update back to server
                if (socket.readyState === WebSocket.OPEN) {
                  socket.send(
                    JSON.stringify({
                      type: "DEVICE_STATUS_UPDATE",
                      senderId: selectedDeviceId,
                      payload: {
                        deviceId: selectedDeviceId,
                        status: "online",
                        currentPlaying: newTitle,
                        url: newUrl,
                        timestamp: new Date().toISOString(),
                      },
                      timestamp: new Date().toISOString(),
                    })
                  );
                }
              }
            }

            // 2. UPDATE_DEVICE_CONFIG / UPDATE_LOCATION
            else if (command === "UPDATE_DEVICE_CONFIG" || command === "UPDATE_LOCATION" || command === "CONFIG_UPDATE") {
              const newLoc = args.lokasi || args.location;
              if (newLoc) {
                setActiveLocation(newLoc);
                triggerToast(`📍 Lokasi ${targetId} diperbarui: ${newLoc}`);
              }
            }

            // 3. NOTIFY
            else if (command === "NOTIFY") {
              triggerToast(`📢 Notifikasi Admin: ${args.title || ""} - ${args.body || ""}`);
            } else {
              triggerToast(`⚡ Aksi Admin Dijalankan: ${command}`);
            }
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("Error processing simulator WS message:", err);
      }
    };

    socket.onclose = (event) => {
      setWsClientStatus("disconnected");
      if (event.code === 4004 || event.code === 4001 || event.code === 4000) {
        setIsConnected(false);
        addLog("ERROR", `Koneksi ditutup oleh server (Kode: ${event.code}) - ID Tidak Terdaftar!`);
      } else {
        addLog("INFO", `Koneksi WebSocket terputus (Kode: ${event.code}).`);
      }
    };

    socket.onerror = () => {
      setWsClientStatus("disconnected");
      addLog("ERROR", "Kesalahan koneksi WebSocket simulator.");
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, [isConnected, selectedDeviceId]);

  // Keyboard shortcut listener ('C' for Clean mode, 'Space' for play/pause, 'Escape')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key.toLowerCase() === "c") {
        setIsCleanMode((prev) => !prev);
      } else if (e.key === " " && isConnected) {
        e.preventDefault();
        togglePlayState();
      } else if (e.key === "Escape") {
        if (isCleanMode) setIsCleanMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isConnected, isCleanMode]);

  // Video playback control
  const togglePlayState = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      addLog("STATUS", "Playback dijeda oleh pengguna");
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      addLog("STATUS", "Playback dilanjutkan (Looping)");
    }
  };

  // Switch simulated device
  const handleSelectDevice = (devId: string) => {
    const matched = deviceList.find((d) => d.id.toUpperCase() === devId.toUpperCase());
    setSelectedDeviceId(devId.toUpperCase());
    setIsConnected(true);
    if (matched) {
      setActiveLocation(matched.lokasi);
      if (matched.current_playing) {
        setCurrentTitle(matched.current_playing);
      }
    }
    triggerToast(`Mengalihkan simulasi ke [${devId.toUpperCase()}]...`);
    addLog("INFO", `Beralih ke perangkat [${devId.toUpperCase()}]`);
  };

  // Disconnect device to Standby
  const handleDisconnect = () => {
    setIsConnected(false);
    triggerToast(`✓ Simulator masuk ke mode Standby.`);
    addLog("STATUS", `Koneksi diputus, layar beralih ke STANDBY`);
    if (wsSimRef.current) {
      wsSimRef.current.close();
    }
  };

  // Connect from Standby form
  const handleStandbyConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const rawId = standbyInputId.trim().toUpperCase();
    if (!rawId) return;

    // Check if ID is in registered devices
    const matched = deviceList.find((d) => d.id.toUpperCase() === rawId);
    if (!matched) {
      alert(`❌ GAGAL TERHUBUNG!\n\nDevice ID "${rawId}" belum didaftarkan di database.\nSilakan daftarkan terlebih dahulu melalui menu Devices & Fleet.`);
      triggerToast(`❌ Device ID "${rawId}" tidak terdaftar di database!`, true);
      return;
    }

    setSelectedDeviceId(matched.id);
    setActiveLocation(matched.lokasi);
    if (matched.current_playing) {
      setCurrentTitle(matched.current_playing);
    }
    setIsConnected(true);
    setStandbyInputId("");
    triggerToast(`✓ Berhasil terhubung ke: ${matched.id}`);
    addLog("INFO", `Berhasil menghubungkan simulator ke [${matched.id}] (${matched.lokasi})`);
  };

  // Direct Quick Push Test (Kirim konten langsung dari panel kontrol simulator)
  const handleExecuteQuickPush = async () => {
    if (!quickPushUrl.trim() || !selectedDeviceId) return;

    setIsSendingQuickPush(true);
    const title = quickPushTitle.trim() || "Uji Tayangan Langsung";

    try {
      // Send command through REST /api/devices or directly simulate WebSocket push
      setCurrentUrl(quickPushUrl.trim());
      setCurrentTitle(title);
      setCurrentDescription(`Tayangan diuji secara instan melalui Quick Push Tester pada ${new Date().toLocaleTimeString()} WIB.`);
      setIsPlaying(true);
      triggerToast(`📡 Push Uji Coba Terkirim: ${title}`);
      addLog("COMMAND", `Quick Push Tester dieksekusi untuk [${selectedDeviceId}]`, { title, url: quickPushUrl });
    } finally {
      setIsSendingQuickPush(false);
    }
  };

  // Fullscreen toggle for screen
  const toggleFullscreen = () => {
    if (!screenWrapperRef.current) return;
    if (!document.fullscreenElement) {
      screenWrapperRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <SignageShell wsStatus={wsClientStatus}>
      <div className="flex flex-col w-full gap-space-lg">
        {/* Header Overview Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container p-gutter-md rounded-xl shadow-sm border border-surface-variant/30">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-2xl">desktop_windows</span>
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
                Simulasi Client Player
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-code-sm font-semibold bg-tertiary-container/30 text-tertiary border border-tertiary/20">
                1:1 ELECTRON MIRROR
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
              Simulator layar client player berbasis web yang identik 100% dengan aplikasi desktop Electron. Menampilkan layout, video player, HUD overlay, serta merespons langsung terhadap push video dan perintah broadcast dari Dashboard secara real-time.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-space-md self-start md:self-auto bg-surface-container-high px-space-md py-space-sm rounded-lg border border-surface-variant/30">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Device Disimulasikan</span>
              <span className="font-code-sm text-xs font-bold text-primary flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[15px]">tv</span>
                {selectedDeviceId}
              </span>
            </div>
            <div className="w-px h-8 bg-surface-variant"></div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Status WebSocket</span>
              <span className="font-code-sm text-xs font-semibold flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    wsClientStatus === "connected" && isConnected
                      ? "bg-tertiary animate-pulse"
                      : "bg-error"
                  }`}
                ></span>
                <span className={isConnected && wsClientStatus === "connected" ? "text-tertiary" : "text-error"}>
                  {isConnected && wsClientStatus === "connected" ? "ONLINE (MIRROR)" : "STANDBY / OFFLINE"}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* ADMIN SIMULATOR TOOLBAR CONTROLS */}
        <div className="bg-surface-container-high p-4 rounded-xl border border-surface-variant/40 shadow-md flex flex-wrap items-center justify-between gap-4">
          {/* Left: Device Selection & State */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-label-md text-on-surface-variant font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">sensors</span>
                Pilih Device:
              </span>
              <div className="relative">
                <select
                  value={selectedDeviceId}
                  onChange={(e) => handleSelectDevice(e.target.value)}
                  className="bg-surface-dim text-on-surface font-code-sm text-xs rounded-lg px-3 py-1.5 pr-8 border border-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer appearance-none"
                >
                  {deviceList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.id} ({d.lokasi})
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-outline text-[18px]">
                  arrow_drop_down
                </span>
              </div>
            </div>

            {/* Status Disconnect / Connect Button */}
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-lg text-xs font-code-sm font-semibold transition-all text-error bg-error/10 hover:bg-error/20 border border-error/30 flex items-center gap-1.5 cursor-pointer"
                title="Beralih ke Layar Standby"
              >
                <span className="material-symbols-outlined text-[16px]">link_off</span>
                <span>Masuk Standby</span>
              </button>
            ) : (
              <button
                onClick={() => setIsConnected(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-code-sm font-semibold transition-all text-on-primary-container bg-primary-container hover:bg-secondary-container flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">link</span>
                <span>Sambungkan Device</span>
              </button>
            )}

            <div className="w-px h-6 bg-surface-variant hidden sm:block"></div>

            {/* Display View Toggles */}
            <div className="flex items-center gap-1 bg-surface-dim p-1 rounded-lg border border-surface-variant/40">
              <button
                onClick={() => setViewBezel(!viewBezel)}
                className={`px-2.5 py-1 rounded text-xs font-code-sm flex items-center gap-1 transition-colors ${
                  viewBezel
                    ? "bg-primary-container text-on-primary-container font-semibold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                title="Toggle Bingkai Bezel TV Signage"
              >
                <span className="material-symbols-outlined text-[15px]">tv</span>
                <span>Frame Bezel</span>
              </button>
              <button
                onClick={() => setIsCleanMode(!isCleanMode)}
                className={`px-2.5 py-1 rounded text-xs font-code-sm flex items-center gap-1 transition-colors ${
                  isCleanMode
                    ? "bg-tertiary-container/40 text-tertiary font-semibold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                title="Mode Layar Bersih (Video Penuh Tanpa HUD, Tekan 'C')"
              >
                <span className="material-symbols-outlined text-[15px]">visibility</span>
                <span>Layar Bersih (C)</span>
              </button>
              <button
                onClick={toggleFullscreen}
                className="px-2.5 py-1 rounded text-xs font-code-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1 transition-colors"
                title="Layar Penuh Display"
              >
                <span className="material-symbols-outlined text-[15px]">fullscreen</span>
                <span>Layar Penuh</span>
              </button>
            </div>
          </div>

          {/* Right: Quick Push Tester Directly from Admin */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-label-md text-on-surface-variant font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-tertiary">send</span>
              Uji Cepat Media:
            </span>
            <select
              value={quickPushUrl}
              onChange={(e) => {
                setQuickPushUrl(e.target.value);
                const found = contentList.find((c) => c.payload === e.target.value);
                if (found) setQuickPushTitle(found.judul);
              }}
              className="bg-surface-dim text-on-surface font-code-sm text-xs rounded-lg px-2.5 py-1.5 border border-surface-variant/50 focus:outline-none max-w-[200px] truncate"
            >
              <option value="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4">
                Big Buck Bunny (Demo MP4)
              </option>
              <option value="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4">
                Elephants Dream (Demo MP4)
              </option>
              {contentList.map((c) => (
                <option key={c.id} value={c.payload}>
                  {c.judul}
                </option>
              ))}
            </select>
            <button
              onClick={handleExecuteQuickPush}
              disabled={isSendingQuickPush || !isConnected}
              className="px-3 py-1.5 rounded-lg text-xs font-code-sm font-semibold text-on-primary-container bg-primary-container hover:bg-secondary-container flex items-center gap-1 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[15px]">cell_tower</span>
              <span>Push ke Simulator</span>
            </button>
          </div>
        </div>

        {/* MAIN VISUAL STAGE: 1:1 ELECTRON DIGITAL SIGNAGE PLAYER SIMULATOR */}
        <div
          ref={screenWrapperRef}
          className={`w-full flex flex-col items-center justify-center transition-all duration-300 ${
            viewBezel ? "p-3 sm:p-6 bg-slate-950/80 rounded-2xl border-4 border-slate-800 shadow-2xl relative" : ""
          }`}
        >
          {/* TV Signage Commercial Top Bezel Label */}
          {viewBezel && (
            <div className="w-full flex items-center justify-between pb-2 px-1 text-[11px] font-code-sm text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                <span className="tracking-widest uppercase font-semibold text-slate-300">
                  DIGITAL SIGNAGE COMMERCIAL DISPLAY 55&quot; // 4K UHD
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-mono">HDMI 1 // 60Hz</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full shadow-sm ${
                      isConnected ? "bg-tertiary animate-pulse" : "bg-error"
                    }`}
                  ></span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {isConnected ? "PWR ON" : "STANDBY"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actual Screen Box matching Electron index.html (16:9 Aspect Ratio) */}
          <div className="w-full aspect-video bg-surface-dim rounded-xl overflow-hidden shadow-2xl border border-outline-variant/30 flex flex-col justify-between relative select-none group">
            {/* Top Electron Header Bar */}
            <header
              className={`w-full bg-surface-container-lowest/95 backdrop-blur-md px-4 py-2.5 flex items-center justify-between border-b border-outline-variant/40 shadow-xl gap-3 z-30 transition-all duration-300 ${
                isCleanMode ? "opacity-0 -translate-y-full pointer-events-none absolute" : "relative"
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Brand Identifier */}
                <div className="flex items-center gap-2 shrink-0 pr-2 border-r border-outline-variant/30">
                  <span
                    className="material-symbols-outlined text-primary text-xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    tv_signin
                  </span>
                  <span className="font-code-sm text-xs text-on-surface uppercase tracking-wider font-bold">
                    Fleet Player
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary-container/30 text-primary border border-primary/30 font-code-sm font-semibold">
                    CLIENT v2.4
                  </span>
                </div>

                {/* Connected Count Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container text-xs font-code-sm text-on-surface-variant border border-outline-variant/30 shrink-0">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? "bg-tertiary" : "bg-slate-500"
                    }`}
                  ></span>
                  <span className="font-medium text-on-surface">
                    {isConnected ? `1 Device Terhubung (${selectedDeviceId})` : "0 Device Terhubung (Offline)"}
                  </span>
                </div>

                {/* Device Tabs Strip */}
                <div className="flex items-center gap-1.5 bg-surface-container/70 p-1 rounded-lg border border-outline-variant/30 overflow-x-auto flex-1 min-w-0">
                  {isConnected && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary-container text-on-primary-container font-code-sm text-xs font-bold shadow-sm">
                      <span className="material-symbols-outlined text-[14px]">tv</span>
                      <span>{selectedDeviceId}</span>
                      <button
                        onClick={handleDisconnect}
                        className="ml-1 text-on-primary-container/70 hover:text-white"
                        title="Putuskan perangkat ini"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Action: Mode Layar Bersih */}
                <button
                  onClick={() => setIsCleanMode(!isCleanMode)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-code-sm font-semibold transition-all text-tertiary bg-tertiary/10 hover:bg-tertiary/20 border border-tertiary/30 shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Buka Mode Layar Bersih (Video Penuh Tanpa Ikon)"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  <span className="hidden sm:inline">Layar Bersih</span>
                </button>

                {/* Audio Toggle */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-code-sm font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                    isMuted
                      ? "text-on-surface-variant bg-surface-container border-outline-variant/40"
                      : "text-tertiary bg-tertiary/10 border-tertiary/30"
                  }`}
                  title={isMuted ? "Audio Dinonaktifkan (Klik untuk Suara)" : "Audio Aktif"}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isMuted ? "volume_off" : "volume_up"}
                  </span>
                  <span className="hidden sm:inline">{isMuted ? "Muted" : "Suara Aktif"}</span>
                </button>
              </div>

              {/* Right: Location & Simulated Window Controls */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden lg:flex items-center gap-3 bg-surface-container/80 backdrop-blur-md px-3 py-1 rounded-lg border border-outline-variant/30 text-code-sm font-code-sm">
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[15px] text-outline">location_on</span>
                    <span>{isConnected ? activeLocation : "Belum Terhubung"}</span>
                  </div>
                  <span className="w-1 h-3 rounded bg-outline-variant"></span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full shadow-sm ${
                        isConnected ? "bg-tertiary shadow-[0_0_8px_rgba(78,222,163,0.7)]" : "bg-slate-500"
                      }`}
                    ></span>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        isConnected ? "text-tertiary" : "text-outline"
                      }`}
                    >
                      {isConnected ? "ONLINE" : "STANDBY"}
                    </span>
                  </div>
                </div>

                {/* Simulated Window Control buttons */}
                <div className="flex items-center gap-1.5 text-outline pl-2 border-l border-outline-variant/30">
                  <div className="w-3 h-3 rounded-full bg-outline-variant cursor-default" title="Minimize"></div>
                  <div className="w-3 h-3 rounded-full bg-outline-variant cursor-default" title="Maximize"></div>
                  <div
                    onClick={handleDisconnect}
                    className="w-3 h-3 rounded-full bg-error/70 hover:bg-error transition-colors cursor-pointer"
                    title="Close / Standby"
                  ></div>
                </div>
              </div>
            </header>

            {/* SCREEN CONTENT AREA */}
            <div className="relative flex-1 w-full h-full overflow-hidden flex flex-col justify-between">
              {/* 1. STANDBY SCREEN (MATCHING ELECTRON STANDBY 100%) */}
              {!isConnected && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-surface-container-lowest">
                  <div className="w-16 h-16 rounded-2xl bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-outline mb-3 shadow-lg">
                    <span className="material-symbols-outlined text-4xl text-primary">cast_connected</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-outline-variant/30 text-xs font-code-sm text-outline mb-2">
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    <span>STATUS: STANDBY (BELUM TERHUBUNG)</span>
                  </div>
                  <h2 className="font-headline-md text-lg font-bold text-on-surface mb-1">
                    Hubungkan Display Signage
                  </h2>
                  <p className="font-body-sm text-xs text-on-surface-variant max-w-sm mb-4 leading-relaxed">
                    Masukkan <strong>Device ID</strong> Anda di bawah ini untuk menghubungkan layar signage ini dengan Admin Dashboard.
                  </p>

                  <form onSubmit={handleStandbyConnect} className="w-full max-w-xs flex flex-col gap-2.5">
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">badge</span>
                      <input
                        type="text"
                        required
                        value={standbyInputId}
                        onChange={(e) => setStandbyInputId(e.target.value)}
                        placeholder="Device ID (cth: DEV-01)"
                        className="w-full pl-9 pr-3 py-2 bg-surface-container rounded-lg border border-outline-variant/40 text-on-surface placeholder:text-outline font-code-sm text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary uppercase tracking-wider font-semibold"
                      />
                    </div>

                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-code-sm text-outline">Pilihan Cepat:</span>
                      {deviceList.slice(0, 4).map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setStandbyInputId(d.id)}
                          className="px-2 py-0.5 rounded bg-surface-container-high hover:bg-primary-container hover:text-on-primary-container text-on-surface-variant text-[11px] font-code-sm transition-colors border border-outline-variant/30 cursor-pointer font-bold"
                        >
                          {d.id}
                        </button>
                      ))}
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-1 py-2 rounded-lg bg-primary-container text-on-primary-container hover:bg-blue-600 font-bold text-xs font-code-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">link</span>
                      <span>Hubungkan Sekarang</span>
                    </button>
                  </form>
                </div>
              )}

              {/* 2. LIVE VIDEO DISPLAY */}
              <div className="absolute inset-0 bg-surface-container-lowest brightness-[0.80] flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  src={currentUrl}
                  loop
                  muted={isMuted}
                  playsInline
                  autoPlay
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Vignette Overlay Gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/40 to-surface-container-lowest/30 pointer-events-none z-10 transition-opacity duration-300 ${
                  isCleanMode ? "opacity-0" : "opacity-100"
                }`}
              ></div>

              {/* Top Playback & Node Info Badges */}
              <div
                className={`relative z-20 p-space-md sm:p-space-lg flex justify-between items-start transition-opacity duration-300 ${
                  isCleanMode || !isConnected ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
              >
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 bg-primary-container text-on-primary-container px-3 py-1.5 rounded-lg font-code-sm text-xs font-bold uppercase shadow-lg border border-primary/30">
                    <span className="material-symbols-outlined text-[16px]">smart_display</span>
                    <span>TIPE: VIDEO</span>
                  </div>
                  <div className="flex items-center gap-2 bg-surface-container-highest/90 backdrop-blur-md text-on-surface font-code-sm text-xs px-3 py-1.5 rounded-lg border border-outline-variant/40 shadow-sm">
                    <span className="text-primary font-bold">{selectedDeviceId}</span>
                    <span className="text-outline">•</span>
                    <span className="text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-tertiary">pin_drop</span>
                      <span>{activeLocation}</span>
                    </span>
                  </div>
                </div>

                {/* Active Playback Status Pill */}
                <div className="bg-surface-container/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg flex items-center gap-2.5 border border-outline-variant/30 shadow-md font-code-sm text-xs text-on-surface">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(78,222,163,0.7)] ${
                      isPlaying ? "bg-tertiary animate-pulse" : "bg-outline"
                    }`}
                  ></span>
                  <span className="font-medium tracking-wide">
                    {isPlaying ? "Pemutaran Aktif (Looping)" : "Video Dijeda (Paused)"}
                  </span>
                </div>
              </div>

              {/* Center Minimalist Playback Control */}
              <div
                className={`relative z-20 flex items-center w-full px-space-lg pointer-events-none my-auto justify-center transition-opacity duration-300 ${
                  isCleanMode || !isConnected ? "opacity-0" : "opacity-100"
                }`}
              >
                <div className="flex flex-col items-center gap-2 pointer-events-auto">
                  <button
                    onClick={togglePlayState}
                    className="p-4 rounded-full bg-surface-container-lowest/80 backdrop-blur-md border border-white/10 text-on-surface shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer group/btn"
                    title="Klik untuk Play / Pause"
                  >
                    <span className="material-symbols-outlined text-[44px] text-tertiary opacity-90 group-hover/btn:text-primary transition-colors">
                      {isPlaying ? "play_circle" : "pause_circle"}
                    </span>
                  </button>
                  <span className="font-code-sm text-[11px] text-on-surface-variant tracking-wider uppercase bg-surface-container-lowest/60 px-2.5 py-0.5 rounded border border-outline-variant/20">
                    Sinkronisasi Admin Berjalan
                  </span>
                </div>
              </div>

              {/* Live Push Toast Notification (Exact from Electron) */}
              {pushToast && (
                <div
                  className={`absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 rounded-xl border shadow-2xl flex items-center gap-3 font-code-sm text-xs transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
                    pushToast.isError
                      ? "bg-error text-on-error border-error/50"
                      : "bg-primary-container text-on-primary-container border-primary/40"
                  }`}
                >
                  <span className="material-symbols-outlined text-tertiary animate-spin text-[18px]">sync</span>
                  <span>{pushToast.message}</span>
                </div>
              )}

              {/* Floating Exit Pill for Clean Video Mode */}
              {isCleanMode && (
                <div className="absolute top-4 right-4 z-50 transition-all duration-300 flex items-center gap-2">
                  <div className="px-3.5 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-white text-xs font-code-sm flex items-center gap-2.5 shadow-2xl">
                    <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                    <span className="font-semibold text-white/90">Mode Layar Bersih</span>
                    <button
                      onClick={() => setIsCleanMode(false)}
                      className="ml-1.5 px-2.5 py-0.5 rounded-md bg-white/20 hover:bg-error text-white text-[11px] font-bold cursor-pointer transition-colors"
                      title="Keluar dari Layar Bersih (Esc / Tombol)"
                    >
                      ✕ Keluar
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Content Details & Direct Video Payload Footer */}
              <div
                className={`relative z-20 p-4 sm:p-6 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/30 flex flex-col md:flex-row items-end justify-between gap-4 transition-opacity duration-300 ${
                  isCleanMode || !isConnected ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
              >
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2 mb-2 font-code-sm text-[11px]">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-tertiary/10 border border-tertiary/30 text-tertiary font-bold tracking-wider uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>Online
                    </span>
                    <span className="text-outline-variant">|</span>
                    <span className="text-on-surface-variant flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-primary">tv</span> Device ID:{" "}
                      <strong className="text-on-surface font-semibold">{selectedDeviceId}</strong>
                    </span>
                    <span className="text-outline-variant">|</span>
                    <span className="text-on-surface-variant flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-secondary">location_on</span>{" "}
                      <span>{activeLocation}</span>
                    </span>
                  </div>
                  <h1 className="font-headline-xl text-lg sm:text-2xl text-on-surface font-extrabold tracking-tight drop-shadow-md leading-tight line-clamp-1">
                    {currentTitle}
                  </h1>
                  <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1 max-w-xl line-clamp-2">
                    {currentDescription}
                  </p>
                </div>

                {/* Payload Video URL Card */}
                <div className="w-full md:w-auto flex flex-col items-start md:items-end gap-1.5 font-code-sm min-w-0 max-w-full">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5 font-semibold">
                    <span className="material-symbols-outlined text-[13px] text-primary">cloud_sync</span> Payload Video Aktif (Admin Config)
                  </div>
                  <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/30 max-w-full shadow-inner">
                    <span className="material-symbols-outlined text-[16px] text-tertiary shrink-0">link</span>
                    <span className="text-xs text-primary font-code-sm truncate max-w-[240px] sm:max-w-[320px]">
                      {currentUrl}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant/30 font-bold shrink-0">
                      VIDEO
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LIVE WEBSOCKET ACTIVITY & COMMAND INSPECTOR */}
        <div className="bg-surface-container rounded-xl border border-surface-variant/30 shadow-sm overflow-hidden">
          <div className="p-4 bg-surface-container-high border-b border-surface-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-lg">terminal</span>
              <h3 className="font-headline-sm text-sm font-bold text-on-surface">
                Simulator Real-Time Event Inspector
              </h3>
              <span className="bg-surface-container font-code-sm text-[11px] text-on-surface-variant px-2 py-0.5 rounded-full border border-surface-variant/40">
                {logs.length} Event
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogs([])}
                className="text-xs font-code-sm text-on-surface-variant hover:text-on-surface px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-highest transition-colors"
              >
                Bersihkan Log
              </button>
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="text-xs font-code-sm text-primary hover:underline px-2 py-1"
              >
                {showLogs ? "Sembunyikan" : "Tampilkan"}
              </button>
            </div>
          </div>

          {showLogs && (
            <div className="p-4 flex flex-col gap-2 max-h-64 overflow-y-auto font-code-sm text-xs">
              {logs.length === 0 ? (
                <div className="text-center py-6 text-outline">
                  Belum ada event WebSocket yang tercatat pada sesi simulator ini.
                </div>
              ) : (
                logs.map((log) => {
                  const badgeColor =
                    log.type === "COMMAND"
                      ? "text-primary bg-primary/10 border-primary/30"
                      : log.type === "AUTH"
                      ? "text-tertiary bg-tertiary/10 border-tertiary/30"
                      : log.type === "ERROR"
                      ? "text-error bg-error/10 border-error/30"
                      : "text-secondary bg-secondary/10 border-secondary/30";

                  return (
                    <div
                      key={log.id}
                      className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-surface-dim border border-surface-variant/30 transition-all hover:bg-surface-container-high"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="text-outline shrink-0 font-mono mt-0.5">{log.time}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase shrink-0 ${badgeColor}`}>
                          {log.type}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-on-surface font-medium truncate">{log.summary}</span>
                          {log.detail && (
                            <pre className="text-[11px] text-on-surface-variant overflow-x-auto mt-1 p-1.5 rounded bg-black/30 font-mono">
                              {JSON.stringify(log.detail, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </SignageShell>
  );
}
