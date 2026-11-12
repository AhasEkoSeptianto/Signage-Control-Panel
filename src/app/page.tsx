"use client";

import { useState, useMemo, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { SignageShell } from "@/components/layout/SignageShell";

interface DeviceRow {
  id: string;
  nama?: string;
  location: string;
  status: "ONLINE" | "OFFLINE";
  currentPlaying: string;
  lastSeen: string;
  icon?: string;
  isCustom?: boolean;
}

interface EventLogItem {
  id: string;
  time: string;
  deviceId: string;
  message: string;
  type: "tertiary" | "error" | "secondary" | "primary";
  tag: string;
}

export default function DevicesFleetPage() {
  const { status, electronClients, clientTelemetry, logs, sendCommand } =
    useWebSocket();

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editModalData, setEditModalData] = useState<{
    id: string;
    nama: string;
    location: string;
  } | null>(null);
  const [pushModalData, setPushModalData] = useState<{
    id: string;
    location: string;
  } | null>(null);
  const [pushUrl, setPushUrl] = useState(
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  );
  const [pushTitle, setPushTitle] = useState("Video Promo Diskon Spesial");

  // Form input states for adding device
  const [inputId, setInputId] = useState("");
  const [inputNama, setInputNama] = useState("");
  const [inputLokasi, setInputLokasi] = useState("");

  // Toast notification state
  const [toast, setToast] = useState<{
    message: string;
    icon: string;
    isError?: boolean;
  } | null>(null);

  // Fleet devices state
  const [fleetDevices, setFleetDevices] = useState<DeviceRow[]>([]);

  // Merge with real connected Electron clients from WebSocket (100% reactive)
  const mergedDevices = useMemo(() => {
    const onlineIds = new Set(electronClients.map((c) => c.id.toUpperCase()));

    // Map existing fleet devices
    const list: DeviceRow[] = fleetDevices.map((d) => {
      const isOnline = onlineIds.has(d.id.toUpperCase());
      const tele = clientTelemetry[d.id] || clientTelemetry[d.id.toUpperCase()];
      const livePlaying = tele?.currentPlaying || d.currentPlaying;

      return {
        ...d,
        status: (isOnline ? "ONLINE" : "OFFLINE") as "ONLINE" | "OFFLINE",
        currentPlaying: isOnline
          ? livePlaying
          : d.status === "OFFLINE"
            ? "-"
            : livePlaying,
        lastSeen: isOnline
          ? "Just now (WS Live)"
          : d.lastSeen === "Just now (WS Live)"
            ? "Terputus"
            : d.lastSeen,
      };
    });

    // Also include any connected Electron client that isn't in fleetDevices yet
    electronClients.forEach((client) => {
      const exists = list.some(
        (d) => d.id.toUpperCase() === client.id.toUpperCase(),
      );
      if (!exists) {
        const tele =
          clientTelemetry[client.id] ||
          clientTelemetry[client.id.toUpperCase()];
        list.push({
          id: client.id,
          location: `Area Publik (${client.deviceMeta?.platform || "Desktop"} ${client.deviceMeta?.arch || "x64"})`,
          status: "ONLINE",
          currentPlaying: tele?.currentPlaying || "Signage Player Ready",
          lastSeen: "Just now (WS Live)",
          icon: "desktop_windows",
          isCustom: true,
        });
      }
    });

    return list;
  }, [fleetDevices, electronClients, clientTelemetry]);

  // Filtered devices based on search (ID, lokasi, current playing)
  const filteredDevices = useMemo(() => {
    if (!searchTerm.trim()) return mergedDevices;
    const term = searchTerm.toLowerCase();
    return mergedDevices.filter(
      (d) =>
        d.id.toLowerCase().includes(term) ||
        d.location.toLowerCase().includes(term) ||
        d.currentPlaying.toLowerCase().includes(term),
    );
  }, [mergedDevices, searchTerm]);

  // Real-time Event Logs
  const [eventLogs, setEventLogs] = useState<EventLogItem[]>([
    {
      id: "log-1",
      time: "[14:20:05]",
      deviceId: "DEV-01",
      message: "heartbeat received (ack: 200 OK)",
      type: "tertiary",
      tag: "node_active",
    },
    {
      id: "log-2",
      time: "[14:18:22]",
      deviceId: "DEV-03",
      message: "disconnected - connection timeout (ping missed 3x)",
      type: "error",
      tag: "socket_close",
    },
    {
      id: "log-3",
      time: "[14:15:10]",
      deviceId: "DEV-04",
      message: 'playlist sync broadcast completed: "Pengumuman Internal"',
      type: "secondary",
      tag: "payload_applied",
    },
  ]);

  // Cek otentikasi admin: jika belum login, redirect ke /login
  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = localStorage.getItem("admin_auth");
      if (!auth) {
        window.location.href = "/login";
      }
    }
  }, []);

  // Fetch devices from Database API on mount
  useEffect(() => {
    fetch("/api/devices")
      .then((r) => r.json())
      .then((data) => {
        if (data.devices && data.devices.length > 0) {
          setFleetDevices(
            data.devices.map((d: any) => ({
              id: d.id,
              nama: d.nama || d.name || `Display ${d.id}`,
              location: d.lokasi || d.location || "Gedung Utama",
              status: (d.status === "online" ? "ONLINE" : "OFFLINE") as
                | "ONLINE"
                | "OFFLINE",
              currentPlaying: d.current_playing || "Idle / Default",
              lastSeen: d.last_seen
                ? new Date(d.last_seen).toLocaleTimeString()
                : "Just now",
              icon: "tv",
            })),
          );
        }
      })
      .catch((err) => console.warn("Could not fetch devices:", err));
  }, []);

  // Sync WebSocket logs into Event Logs stream
  useEffect(() => {
    if (logs.length > 0) {
      const latest = logs[0];
      const now = new Date();
      const timeStr = `[${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}]`;

      setEventLogs((prev) => [
        {
          id: latest.id,
          time: timeStr,
          deviceId: latest.type.includes("CLIENT") ? "WS_NODE" : "FLEET_HUB",
          message: latest.summary,
          type: latest.type === "ERROR" ? "error" : "tertiary",
          tag: latest.type.toLowerCase(),
        },
        ...prev.slice(0, 19),
      ]);
    }
  }, [logs]);

  // Show Toast helper
  const showToast = (
    message: string,
    icon = "check_circle",
    isError = false,
  ) => {
    setToast({ message, icon, isError });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  // KPI Calculations
  const totalCount = mergedDevices.length;
  const onlineCount = mergedDevices.filter((d) => d.status === "ONLINE").length;
  const offlineCount = totalCount - onlineCount;
  const onlinePercentage =
    totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0;

  // Add Device Handler
  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLokasi.trim()) return;

    const newId =
      inputId.trim() ||
      `DEV-${String(fleetDevices.length + 1).padStart(2, "0")}`;
    const finalNama = inputNama.trim() || `Display ${newId}`;

    const newDevice: DeviceRow = {
      id: newId,
      nama: finalNama,
      location: inputLokasi.trim(),
      status: "ONLINE",
      currentPlaying: "Idle / Default",
      lastSeen: "Just now",
      icon: "tv",
    };

    setFleetDevices((prev) => [newDevice, ...prev]);

    // 1. Sync to Database API
    fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newId,
        nama: finalNama,
        lokasi: inputLokasi.trim(),
        status: "online",
      }),
    }).catch(() => {});

    // 2. Broadcast live config to all Electron clients
    sendCommand("ALL", "UPDATE_DEVICE_CONFIG", {
      id: newId,
      nama: finalNama,
      lokasi: inputLokasi.trim(),
    });

    // Append to logs
    const now = new Date();
    const timeStr = `[${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}]`;
    setEventLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        time: timeStr,
        deviceId: newId,
        message: `device registered: "${finalNama}" (${newId}) di "${inputLokasi}"`,
        type: "tertiary",
        tag: "db_insert",
      },
      ...prev,
    ]);

    setInputId("");
    setInputNama("");
    setInputLokasi("");
    setIsAddModalOpen(false);
    showToast(`Device ${newId} (${finalNama}) berhasil didaftarkan!`);
  };

  // Edit Device Handler (Edit Nama & Lokasi in Real-Time)
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalData || !editModalData.location.trim()) return;

    const updatedLokasi = editModalData.location.trim();
    const updatedNama = editModalData.nama.trim() || `Display ${editModalData.id}`;
    const targetId = editModalData.id;

    // 1. Update local state
    setFleetDevices((prev) =>
      prev.map((d) =>
        d.id === targetId ? { ...d, nama: updatedNama, location: updatedLokasi } : d,
      ),
    );

    // 2. Sync to Database API
    fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: targetId,
        nama: updatedNama,
        lokasi: updatedLokasi,
      }),
    }).catch(() => {});

    // 3. Broadcast real-time update to Electron clients via WebSocket
    sendCommand("ALL", "UPDATE_DEVICE_CONFIG", {
      id: targetId,
      nama: updatedNama,
      lokasi: updatedLokasi,
    });

    const now = new Date();
    const timeStr = `[${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}]`;
    setEventLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        time: timeStr,
        deviceId: targetId,
        message: `device updated: "${updatedNama}" (${targetId}) -> "${updatedLokasi}"`,
        type: "secondary",
        tag: "device_update",
      },
      ...prev,
    ]);

    setEditModalData(null);
    showToast(`Data perangkat ${targetId} berhasil diperbarui!`);
  };

  // Delete Device Handler
  const handleDeleteDevice = (id: string) => {
    if (confirm(`Hapus device ${id} dari fleet?`)) {
      setFleetDevices((prev) => prev.filter((d) => d.id !== id));

      fetch(`/api/devices?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      }).catch(() => {});

      const now = new Date();
      const timeStr = `[${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}]`;
      setEventLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          time: timeStr,
          deviceId: id,
          message: `device ${id} dihapus dari fleet`,
          type: "error",
          tag: "db_delete",
        },
        ...prev,
      ]);

      showToast(`Device ${id} dihapus dari fleet`, "delete");
    }
  };

  // Push Content Handler (Updates current playing in real-time)
  const handleExecutePush = () => {
    if (!pushModalData) return;

    showToast(`Pushing tayangan ke ${pushModalData.id}...`, "sync");

    // 1. Dispatch command via real WebSocket
    sendCommand(pushModalData.id, "OPEN_URL", {
      url: pushUrl,
      title: pushTitle,
    });

    // 2. Update table row current playing immediately
    setFleetDevices((prev) =>
      prev.map((d) =>
        d.id === pushModalData.id ? { ...d, currentPlaying: pushTitle } : d,
      ),
    );

    // 3. Persist current_playing to backend
    fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: pushModalData.id,
        current_playing: pushTitle,
      }),
    }).catch(() => {});

    const now = new Date();
    const timeStr = `[${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}]`;
    setEventLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        time: timeStr,
        deviceId: pushModalData.id,
        message: `konten push aktif: "${pushTitle}"`,
        type: "secondary",
        tag: "ws_push",
      },
      ...prev,
    ]);

    setTimeout(() => {
      showToast(
        `Tayangan "${pushTitle}" aktif di ${pushModalData.id}!`,
        "done_all",
      );
      setPushModalData(null);
    }, 600);
  };

  return (
    <SignageShell wsStatus={status}>
      <div className="flex flex-col w-full gap-space-lg">
        {/* Top Real-time WebSocket Connectivity Bar */}
        <div className="bg-surface-container-low px-gutter-md py-space-sm rounded-xl flex flex-wrap items-center justify-between gap-space-sm shadow-sm border border-surface-variant/30">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="relative flex items-center justify-center w-3 h-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
            </div>
            <div className="flex flex-wrap items-center gap-space-xs">
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                WebSocket Fleet Live
              </span>
              <span className="font-code-sm text-code-sm text-primary px-space-xs py-0.5 rounded bg-surface-container font-mono">
                ws://localhost:3000/ws
              </span>
              <span className="text-outline text-body-sm font-body-sm hidden sm:inline">
                •
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                Lokasi dan Current Playing tersinkronisasi otomatis secara
                real-time
              </span>
            </div>
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="font-code-sm text-code-sm text-tertiary px-space-sm py-1 rounded-full bg-tertiary/10 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">
                sync
              </span>
              Realtime Synced: public.devices
            </span>
          </div>
        </div>

        {/* Summary KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {/* Card 1: Total Devices */}
          <div className="bg-surface-container rounded-xl p-space-md flex flex-col justify-between shadow-sm relative overflow-hidden group border border-surface-variant/30">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant">
                Total Devices
              </span>
              <span className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">
                  devices
                </span>
              </span>
            </div>
            <div className="mt-space-sm flex items-baseline gap-space-xs">
              <span className="font-headline-xl text-headline-xl text-on-surface">
                {totalCount}
              </span>
              <span className="font-code-sm text-code-sm text-on-surface-variant">
                device terdaftar
              </span>
            </div>
            <div className="mt-space-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-tertiary text-[14px]">
                check_circle
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Schema public.devices
              </span>
            </div>
          </div>

          {/* Card 2: Online Devices */}
          <div className="bg-surface-container rounded-xl p-space-md flex flex-col justify-between shadow-sm relative overflow-hidden group border border-surface-variant/30">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant">
                Online Players
              </span>
              <span className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-[18px]">
                  wifi
                </span>
              </span>
            </div>
            <div className="mt-space-sm flex items-baseline gap-space-xs">
              <span className="font-headline-xl text-headline-xl text-tertiary">
                {onlineCount}
              </span>
              <span className="font-code-sm text-code-sm text-on-surface-variant">
                / {totalCount} aktif
              </span>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-1.5 mt-space-sm overflow-hidden">
              <div
                className="bg-tertiary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${onlinePercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Card 3: Offline Alert */}
          <div className="bg-surface-container rounded-xl p-space-md flex flex-col justify-between shadow-sm relative overflow-hidden group border border-surface-variant/30">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant">
                Offline Players
              </span>
              <span className="w-8 h-8 rounded-lg bg-error-container/20 flex items-center justify-center text-error">
                <span className="material-symbols-outlined text-[18px]">
                  wifi_off
                </span>
              </span>
            </div>
            <div className="mt-space-sm flex items-baseline gap-space-xs">
              <span className="font-headline-xl text-headline-xl text-error">
                {offlineCount}
              </span>
              <span className="font-code-sm text-code-sm text-on-surface-variant">
                perlu perhatian
              </span>
            </div>
            <div className="mt-space-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-error text-[14px]">
                report_problem
              </span>
              <span className="font-body-sm text-body-sm text-error">
                {offlineCount > 0
                  ? `${offlineCount} device tidak tersambung`
                  : "Semua player aktif"}
              </span>
            </div>
          </div>

          {/* Card 4: WebSocket Events */}
          <div className="bg-surface-container rounded-xl p-space-md flex flex-col justify-between shadow-sm relative overflow-hidden group border border-surface-variant/30">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant">
                WebSocket Status
              </span>
              <span className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[18px]">
                  electric_bolt
                </span>
              </span>
            </div>
            <div className="mt-space-sm flex items-baseline gap-space-xs">
              <span className="font-headline-xl text-headline-xl text-secondary">
                Realtime
              </span>
              <span className="font-code-sm text-code-sm text-on-surface-variant">
                telemetry
              </span>
            </div>
            <div className="mt-space-sm flex items-center gap-1 text-on-surface-variant">
              <span className="font-code-sm text-code-sm font-mono truncate">
                Latency ~10ms
              </span>
            </div>
          </div>
        </div>

        {/* Primary Fleet Control & Table Section */}
        <div className="bg-surface-container rounded-xl p-gutter shadow-sm flex flex-col gap-space-md border border-surface-variant/30">
          {/* Header with Actions & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div>
              <div className="flex items-center gap-space-xs">
                <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Daftar Perangkat Fleet
                </span>
                <span className="px-2 py-0.5 rounded text-code-sm font-code-sm bg-surface-container-high text-on-surface-variant">
                  public.devices
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Kelola perangkat signage player, pantau tayangan media secara
                real-time, dan perbarui lokasi fisik.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-space-sm">
              <div className="relative min-w-[220px]">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">
                  search
                </span>
                <input
                  className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline text-body-sm font-body-sm pl-9 pr-space-md py-2 rounded-lg outline-none focus:bg-surface-container-high transition-colors"
                  placeholder="Cari Device ID, lokasi..."
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                className="px-space-md py-2 rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md font-semibold hover:bg-secondary-container transition-colors flex items-center gap-space-xs shadow-sm active:scale-95"
                onClick={() => setIsAddModalOpen(true)}
              >
                <span className="material-symbols-outlined text-[18px]">
                  add
                </span>
                <span>+ Tambah Device Baru</span>
              </button>
            </div>
          </div>

          {/* Data Table: NO "Nama Node" Column! Solely ID, Lokasi, Status, Current Playing, Last Seen */}
          <div className="overflow-x-auto rounded-lg bg-surface-container-low border border-surface-variant/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest text-on-surface-variant text-label-sm font-label-sm uppercase tracking-wider">
                  <th className="py-3 px-space-md font-medium">Device ID</th>
                  <th className="py-3 px-space-md font-medium">Lokasi</th>
                  <th className="py-3 px-space-md font-medium">Status</th>
                  <th className="py-3 px-space-md font-medium">
                    Current Playing
                  </th>
                  <th className="py-3 px-space-md font-medium">Last Seen</th>
                  <th className="py-3 px-space-md font-medium text-right">
                    Quick Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-0 text-body-md font-body-md">
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-on-surface-variant font-body-sm"
                    >
                      Tidak ada device yang cocok dengan pencarian "{searchTerm}
                      ".
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((device) => {
                    const isOnline = device.status === "ONLINE";
                    return (
                      <tr
                        key={device.id}
                        className="hover:bg-surface-container-high/60 transition-colors group border-b border-surface-variant/20 last:border-b-0"
                      >
                        {/* Device ID & Nama */}
                        <td className="py-3.5 px-space-md font-code-sm text-code-sm font-mono text-primary font-medium">
                          <div className="flex items-center gap-space-xs">
                            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                              {device.icon || "tv"}
                            </span>
                            <div className="flex flex-col">
                              <span className="font-bold text-primary">
                                {device.id}
                              </span>
                              <span className="text-[11px] text-on-surface-variant font-sans font-normal">
                                {device.nama || "Display Signage"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Lokasi */}
                        <td className="py-3.5 px-space-md text-on-surface font-medium text-body-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px] text-tertiary">
                              location_on
                            </span>
                            <span>{device.location}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-space-md">
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-tertiary/10 text-tertiary font-semibold">
                              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                              ONLINE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-error-container/20 text-error font-semibold">
                              <span className="w-2 h-2 rounded-full bg-error"></span>
                              OFFLINE
                            </span>
                          )}
                        </td>

                        {/* Current Playing (Real-time synced) */}
                        <td className="py-3.5 px-space-md">
                          {device.currentPlaying === "-" ? (
                            <span className="text-outline font-code-sm text-code-sm">
                              -
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 text-on-surface text-body-sm">
                              <span className="material-symbols-outlined text-[16px] text-secondary">
                                play_circle
                              </span>
                              <span className="truncate max-w-[200px] font-medium">
                                {device.currentPlaying}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Last Seen */}
                        <td
                          className={`py-3.5 px-space-md font-code-sm text-code-sm font-medium ${
                            isOnline ? "text-tertiary" : "text-error"
                          }`}
                        >
                          {device.lastSeen}
                        </td>

                        {/* Quick Actions */}
                        <td className="py-3.5 px-space-md text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              className="p-1.5 rounded-lg bg-primary-container/20 text-primary hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center justify-center"
                              title="Push Content"
                              onClick={() =>
                                setPushModalData({
                                  id: device.id,
                                  location: device.location,
                                })
                              }
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                publish
                              </span>
                            </button>
                            <a
                              href={`/simulation?deviceId=${encodeURIComponent(device.id)}`}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-tertiary-container/30 hover:text-tertiary transition-colors flex items-center justify-center"
                              title="Buka di Simulasi Player"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                desktop_windows
                              </span>
                            </a>
                            <button
                              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors flex items-center justify-center"
                              title="Edit Perangkat"
                              onClick={() =>
                                setEditModalData({
                                  id: device.id,
                                  nama: device.nama || `Display ${device.id}`,
                                  location: device.location,
                                })
                              }
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                edit
                              </span>
                            </button>
                            <button
                              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors flex items-center justify-center"
                              title="Delete Device"
                              onClick={() => handleDeleteDevice(device.id)}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                delete
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time WebSocket Event Log Stream Ticker */}
        <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm border border-surface-variant/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                terminal
              </span>
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                Live Realtime Event Stream
              </span>
              <span className="text-code-sm font-code-sm text-on-surface-variant">
                channel: fleet_telemetry
              </span>
            </div>
            <button
              className="text-body-sm font-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
              onClick={() => setEventLogs([])}
            >
              Clear
            </button>
          </div>
          <div className="flex flex-col gap-1.5 font-code-sm text-code-sm font-mono max-h-56 overflow-y-auto">
            {eventLogs.length === 0 ? (
              <div className="text-outline font-body-sm text-center py-2">
                Logs cleared. Waiting for next heartbeat...
              </div>
            ) : (
              eventLogs.map((log) => {
                const colorMap = {
                  tertiary: "text-tertiary",
                  error: "text-error",
                  secondary: "text-secondary",
                  primary: "text-primary",
                };
                return (
                  <div
                    key={log.id}
                    className="p-2 rounded bg-surface-container flex items-center justify-between text-on-surface-variant text-[12px] border border-surface-variant/20"
                  >
                    <div className="flex items-center gap-space-sm">
                      <span className={colorMap[log.type]}>{log.time}</span>
                      <span className="text-primary font-semibold">
                        Device {log.deviceId}
                      </span>
                      <span>{log.message}</span>
                    </div>
                    <span className="text-outline text-body-sm">{log.tag}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal: Tambah Device Baru (ID and Lokasi only, NO nama node) */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-dim/80 backdrop-blur-sm p-gutter">
            <div className="bg-surface-container rounded-xl p-gutter-md max-w-md w-full shadow-2xl flex flex-col gap-space-md border border-surface-variant animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    add_to_queue
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Tambah Device Baru
                  </h3>
                </div>
                <button
                  className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Mendaftarkan perangkat baru ke tabel Postgres{" "}
                <code className="text-primary font-code-sm font-mono">
                  public.devices
                </code>
                .
              </p>
              <form
                className="flex flex-col gap-space-md"
                onSubmit={handleAddDevice}
              >
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">
                    Device ID
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline text-body-md font-body-md px-space-md py-2 rounded-lg outline-none focus:bg-surface-container-high transition-colors border border-surface-variant/40 uppercase font-mono"
                    placeholder={`Contoh: DEV-${String(fleetDevices.length + 1).padStart(2, "0")}`}
                    type="text"
                    value={inputId}
                    onChange={(e) => setInputId(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">
                    Nama Display / Layar <span className="text-tertiary">*</span>
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline text-body-md font-body-md px-space-md py-2 rounded-lg outline-none focus:bg-surface-container-high transition-colors border border-surface-variant/40"
                    placeholder="Contoh: Layar Lobby Utama"
                    required
                    type="text"
                    value={inputNama}
                    onChange={(e) => setInputNama(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">
                    Lokasi Fisik <span className="text-tertiary">*</span>
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline text-body-md font-body-md px-space-md py-2 rounded-lg outline-none focus:bg-surface-container-high transition-colors border border-surface-variant/40"
                    placeholder="Contoh: Gedung C - Ruang Transit Lt. 1"
                    required
                    type="text"
                    value={inputLokasi}
                    onChange={(e) => setInputLokasi(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-end gap-space-sm pt-space-xs">
                  <button
                    className="px-space-md py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high font-label-md text-label-md transition-colors"
                    onClick={() => setIsAddModalOpen(false)}
                    type="button"
                  >
                    Batal
                  </button>
                  <button
                    className="px-space-md py-2 rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md font-semibold hover:bg-secondary-container transition-colors shadow-sm"
                    type="submit"
                  >
                    Simpan Device
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Lokasi Device */}
        {editModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-dim/80 backdrop-blur-sm p-gutter">
            <div className="bg-surface-container rounded-xl p-gutter-md max-w-md w-full shadow-2xl flex flex-col gap-space-md border border-surface-variant animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-secondary text-[20px]">
                    edit
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Edit Perangkat ({editModalData.id})
                  </h3>
                </div>
                <button
                  className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  onClick={() => setEditModalData(null)}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              </div>
              <form
                className="flex flex-col gap-space-md"
                onSubmit={handleSaveEdit}
              >
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">
                    Nama Display
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface rounded-lg px-space-md py-2 text-body-md border border-surface-variant/40 outline-none focus:bg-surface-container-high"
                    type="text"
                    required
                    value={editModalData.nama}
                    onChange={(e) =>
                      setEditModalData({
                        ...editModalData,
                        nama: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">
                    Lokasi Fisik
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface rounded-lg px-space-md py-2 text-body-md border border-surface-variant/40 outline-none focus:bg-surface-container-high"
                    type="text"
                    required
                    value={editModalData.location}
                    onChange={(e) =>
                      setEditModalData({
                        ...editModalData,
                        location: e.target.value,
                      })
                    }
                  />
                  <span className="font-code-sm text-[11px] text-tertiary">
                    ⚡ Perubahan lokasi akan disinkronkan secara real-time ke
                    player Electron
                  </span>
                </div>
                <div className="flex items-center justify-end gap-space-sm pt-space-xs">
                  <button
                    className="px-space-md py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high font-label-md"
                    type="button"
                    onClick={() => setEditModalData(null)}
                  >
                    Batal
                  </button>
                  <button
                    className="px-space-md py-2 rounded-lg bg-primary-container text-on-primary-container font-semibold hover:bg-secondary-container"
                    type="submit"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Push Content Quick Modal */}
        {pushModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-dim/80 backdrop-blur-sm p-gutter">
            <div className="bg-surface-container rounded-xl p-gutter-md max-w-lg w-full shadow-2xl flex flex-col gap-space-md border border-surface-variant animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-secondary-container text-[18px]">
                      cell_tower
                    </span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Push Konten ke {pushModalData.id}
                    </h3>
                    <span className="font-code-sm text-code-sm text-tertiary">
                      Lokasi: {pushModalData.location}
                    </span>
                  </div>
                </div>
                <button
                  className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container-high"
                  onClick={() => setPushModalData(null)}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              </div>

              <div className="flex flex-col gap-space-sm">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">
                    Judul Tayangan
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface rounded-lg px-space-md py-2 text-body-md border border-surface-variant/40 outline-none"
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">
                    Streaming URL / Video Link (MP4, HLS, Web)
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface rounded-lg px-space-md py-2 font-code-sm text-code-sm border border-surface-variant/40 outline-none"
                    value={pushUrl}
                    onChange={(e) => setPushUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-xs">
                <button
                  className="px-space-md py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high"
                  onClick={() => setPushModalData(null)}
                >
                  Batal
                </button>
                <button
                  className="px-space-md py-2 rounded-lg bg-primary-container text-on-primary-container font-semibold hover:bg-secondary-container flex items-center gap-1.5 shadow-md active:scale-95"
                  onClick={handleExecutePush}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    send
                  </span>
                  <span>Kirim via WebSocket</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification Container */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-surface-container-highest px-space-md py-space-sm rounded-xl shadow-2xl flex items-center gap-space-sm border border-surface-variant animate-in fade-in slide-in-from-bottom-5 duration-200">
            <span
              className={`material-symbols-outlined text-[20px] ${
                toast.isError ? "text-error" : "text-tertiary"
              }`}
            >
              {toast.icon}
            </span>
            <span className="font-body-md text-body-md text-on-surface">
              {toast.message}
            </span>
          </div>
        )}
      </div>
    </SignageShell>
  );
}
