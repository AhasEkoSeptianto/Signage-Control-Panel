"use client";

import { useState, useMemo, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { SignageShell } from "@/components/layout/SignageShell";

interface ContentItem {
  id: string;
  title: string;
  type: "video" | "image" | "web_url";
  payload: string;
  resolution: string;
  createdDate: string;
}

export default function ContentMediaPage() {
  const { status, electronClients, sendCommand } = useWebSocket();

  // Content catalog state
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states (URL Only - No File Upload)
  const [formTitle, setFormTitle] = useState("");
  const [formPayload, setFormPayload] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Push modal state
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [selectedPushContent, setSelectedPushContent] = useState<ContentItem | null>(null);
  const [targetDevice, setTargetDevice] = useState("ALL");
  const [isDispatching, setIsDispatching] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<string | null>(null);

  // Preview modal state
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);

  // Device list for target selection
  const [deviceList, setDeviceList] = useState<{ id: string; lokasi: string }[]>([]);

  // Filtered contents
  const filteredContents = useMemo(() => {
    if (!searchQuery.trim()) return contents;
    const q = searchQuery.toLowerCase().trim();
    return contents.filter(
      (item) =>
        item.title.toLowerCase().includes(q) || item.payload.toLowerCase().includes(q)
    );
  }, [contents, searchQuery]);

  // Cek otentikasi admin: jika belum login, redirect ke /login
  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = localStorage.getItem("admin_auth");
      if (!auth) {
        window.location.href = "/login";
      }
    }
  }, []);

  // Fetch contents and devices from persistent backend on mount
  useEffect(() => {
    setIsLoading(true);
    fetch("/api/contents")
      .then((r) => r.json())
      .then((data) => {
        if (data.contents && Array.isArray(data.contents)) {
          setContents(
            data.contents.map((c: any) => ({
              id: c.id,
              title: c.judul || c.title || "Video Signage",
              type: (c.tipe || c.type || "video") as "video" | "image" | "web_url",
              payload: c.payload || c.url || "",
              resolution: "1080p // 60 FPS",
              createdDate: c.created_at
                ? new Date(c.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Tersimpan",
            }))
          );
        }
      })
      .catch((err) => console.warn("Could not fetch contents:", err))
      .finally(() => setIsLoading(false));

    // Fetch registered devices for target dropdown
    fetch("/api/devices")
      .then((r) => r.json())
      .then((data) => {
        if (data.devices && Array.isArray(data.devices)) {
          setDeviceList(
            data.devices.map((d: any) => ({
              id: d.id,
              lokasi: d.lokasi || d.location || "Gedung Utama",
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Handle Add New Content (URL Link Only)
  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formPayload.trim()) return;

    setIsSaving(true);

    try {
      const finalUrl = formPayload.trim();

      // Persist to Backend API (data/contents.json + Supabase)
      const res = await fetch("/api/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judul: formTitle.trim(),
          tipe: "video",
          payload: finalUrl,
          url: finalUrl,
        }),
      });

      const data = await res.json();
      const savedItem = data.content;

      const newItem: ContentItem = {
        id: savedItem?.id || `content-${Date.now()}`,
        title: formTitle.trim(),
        type: "video",
        payload: finalUrl,
        resolution: "1080p // 60 FPS",
        createdDate: "Baru saja",
      };

      setContents((prev) => [newItem, ...prev]);

      // Reset form
      setFormTitle("");
      setFormPayload("");

      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 4000);
    } catch (err: any) {
      alert(`Gagal menyimpan konten: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Content
  const handleDeleteContent = async (item: ContentItem) => {
    if (confirm(`Hapus konten "${item.title}" dari katalog media?`)) {
      setContents((prev) => prev.filter((c) => c.id !== item.id));
      await fetch(`/api/contents?id=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      }).catch(() => {});
    }
  };

  // Open Push Modal
  const openPushModal = (item: ContentItem) => {
    setSelectedPushContent(item);
    setPushFeedback(null);
    setPushModalOpen(true);
  };

  // Execute WebSocket Push
  const handleExecutePush = () => {
    if (!selectedPushContent) return;

    setIsDispatching(true);

    const payload = {
      url: selectedPushContent.payload,
      title: selectedPushContent.title,
    };

    // Send command via WebSocket
    sendCommand(targetDevice, "OPEN_URL", payload);

    // Also update current_playing in backend
    if (targetDevice === "ALL") {
      deviceList.forEach((d) => {
        fetch("/api/devices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: d.id,
            current_playing: selectedPushContent.title,
          }),
        }).catch(() => {});
      });
    } else {
      fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetDevice,
          current_playing: selectedPushContent.title,
        }),
      }).catch(() => {});
    }

    setTimeout(() => {
      setIsDispatching(false);
      setPushFeedback(
        `WebSocket broadcast terkirim ke target [${targetDevice}] untuk konten '${selectedPushContent.title}'!`
      );

      setTimeout(() => {
        setPushModalOpen(false);
        setPushFeedback(null);
      }, 1600);
    }, 500);
  };

  return (
    <SignageShell wsStatus={status}>
      <div className="flex flex-col w-full gap-space-lg">
        {/* Operational Overview Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md bg-surface-container p-gutter-md rounded-xl shadow-sm border border-surface-variant/30">
          <div className="flex flex-col gap-space-xs">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
              Katalog Konten &amp; Media Dispatcher
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Kelola tautan video media signage. Banner kartu di-render langsung dari video URL (bukan gambar template). Push tayangan secara real-time ke player.
            </p>
          </div>

          {/* Live Mini-Stat Strip */}
          <div className="flex items-center gap-space-md self-start md:self-auto bg-surface-container-high px-space-md py-space-sm rounded-lg border border-surface-variant/30">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Total Konten</span>
              <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                {contents.length}
              </span>
            </div>
            <div className="w-px h-8 bg-surface-variant"></div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Banner Preview</span>
              <span className="font-code-sm text-code-sm text-tertiary flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                Direct Live Video
              </span>
            </div>
          </div>
        </div>

        {/* Main Split Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* LEFT PANEL: Add Video Link Form (NO File Upload Form) */}
          <div className="lg:col-span-4 bg-surface-container p-gutter-md rounded-xl shadow-md flex flex-col gap-space-md sticky top-20 border border-surface-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">smart_display</span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Tambah Link Video
                  </h2>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Input tautan URL video langsung
                  </span>
                </div>
              </div>
            </div>

            <form className="flex flex-col gap-space-md" onSubmit={handleSaveContent}>
              {/* Field 1: Judul Konten */}
              <div className="flex flex-col gap-space-xs">
                <label
                  className="font-label-md text-label-md text-on-surface flex items-center justify-between"
                  htmlFor="contentTitle"
                >
                  <span>
                    Judul Konten Video <span className="text-tertiary">*</span>
                  </span>
                </label>
                <input
                  className="w-full bg-surface-dim text-on-surface placeholder:text-outline rounded-lg px-space-md py-space-sm font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-primary transition-all border border-surface-variant/40 shadow-inner"
                  id="contentTitle"
                  placeholder="Contoh: Video Promo Diskon Spesial"
                  required
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              {/* Field 2: Link Video URL */}
              <div className="flex flex-col gap-space-xs">
                <label
                  className="font-label-md text-label-md text-on-surface flex items-center justify-between"
                  htmlFor="contentPayload"
                >
                  <span>
                    Link URL Video <span className="text-tertiary">*</span>
                  </span>
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-surface-dim text-on-surface placeholder:text-outline rounded-lg pl-space-md pr-10 py-space-sm font-code-sm text-code-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all border border-surface-variant/40 shadow-inner"
                    id="contentPayload"
                    placeholder="https://... (mp4, webm, atau link video langsung)"
                    required
                    type="url"
                    value={formPayload}
                    onChange={(e) => setFormPayload(e.target.value)}
                  />
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                    link
                  </span>
                </div>
                <span className="font-code-sm text-[11px] text-on-surface-variant mt-0.5">
                  Banner preview akan langsung di-render dari URL ini tanpa template.
                </span>
              </div>

              {/* Live Mini Preview Box inside Form when user types URL */}
              {formPayload.trim() && (
                <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-surface-dim border border-surface-variant/40">
                  <span className="font-code-sm text-[10px] text-tertiary uppercase tracking-wider flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[13px]">visibility</span>
                    Live Preview Langsung dari URL:
                  </span>
                  <div className="w-full aspect-video bg-surface-container-lowest rounded overflow-hidden relative border border-white/10">
                    <video
                      key={formPayload}
                      src={`${formPayload}#t=0.5`}
                      preload="metadata"
                      controls
                      muted
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Action Button: Simpan Konten */}
              <button
                className="w-full bg-primary-container hover:bg-secondary-container text-on-primary-container py-space-sm px-space-md rounded-lg font-label-md text-label-md font-semibold flex items-center justify-center gap-space-xs transition-all shadow-sm active:scale-[0.99] mt-2"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      progress_activity
                    </span>
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>Simpan Video</span>
                  </>
                )}
              </button>
            </form>

            {/* Feedback Pill */}
            {showSaveToast && (
              <div className="flex items-center gap-space-xs bg-tertiary-container/30 text-on-tertiary-container p-space-sm rounded-lg text-code-sm border border-tertiary/20 animate-in fade-in">
                <span className="material-symbols-outlined text-tertiary text-[18px]">check_circle</span>
                <span>Konten berhasil disimpan secara permanen!</span>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Content Library Grid with DIRECT URL VIDEO BANNER */}
          <div className="lg:col-span-8 flex flex-col gap-space-lg">
            {/* Header & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-xs">
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Katalog Media
                </h2>
                <span className="bg-surface-container-high font-code-sm text-code-sm text-on-surface-variant px-2 py-0.5 rounded-full border border-surface-variant/30">
                  {contents.length} Konten Tersimpan
                </span>
              </div>
              <div className="flex items-center gap-space-xs">
                <div className="relative flex items-center min-w-[240px]">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Cari judul atau URL..."
                    className="w-full bg-surface-container-high text-on-surface placeholder:text-outline rounded-lg pl-9 pr-3 py-1.5 font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-primary border border-surface-variant transition-all text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Content List */}
            {isLoading ? (
              <div className="p-8 text-center text-on-surface-variant font-code-sm">
                Memuat katalog media dari database...
              </div>
            ) : filteredContents.length === 0 ? (
              <div className="p-10 text-center bg-surface-container rounded-xl border border-surface-variant/30">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">video_library</span>
                <p className="text-on-surface font-semibold">Belum ada konten video tersimpan</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Masukkan link URL video di panel sebelah kiri untuk menambahkan.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {filteredContents.map((item) => (
                  <article
                    key={item.id}
                    className="bg-surface-container rounded-xl overflow-hidden shadow-sm flex flex-col justify-between transition-all hover:bg-surface-container-high border border-surface-variant/30 group"
                  >
                    <div>
                      {/* DIRECT VIDEO BANNER PREVIEW (NO TEMPLATE STOCK IMAGES!) */}
                      <div className="relative w-full aspect-video bg-surface-container-lowest overflow-hidden">
                        <video
                          src={`${item.payload}#t=0.5`}
                          preload="metadata"
                          muted
                          playsInline
                          loop
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onMouseEnter={(e) => {
                            const v = e.currentTarget;
                            v.play().catch(() => {});
                          }}
                          onMouseLeave={(e) => {
                            const v = e.currentTarget;
                            v.pause();
                            v.currentTime = 0.5;
                          }}
                        />

                        {/* Top Overlay Badge */}
                        <div className="absolute top-3 left-3 bg-surface-dim/80 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow border border-white/10 pointer-events-none">
                          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                          <span className="font-code-sm text-[10px] text-secondary font-semibold uppercase">
                            DIRECT VIDEO
                          </span>
                        </div>

                        {/* Hover hint */}
                        <div className="absolute top-3 right-3 bg-surface-dim/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-code-sm text-on-surface-variant border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                          Hover: Play Preview
                        </div>

                        {/* Center Play Button to open full preview modal */}
                        <button
                          className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-10"
                          title="Buka Player Video Lengkap"
                          onClick={() => setPreviewItem(item)}
                        >
                          <span className="material-symbols-outlined text-[24px]">play_arrow</span>
                        </button>

                        <div className="absolute bottom-2 right-3 font-code-sm text-[11px] text-on-surface-variant bg-surface-dim/80 px-2 py-0.5 rounded border border-white/5 pointer-events-none">
                          {item.resolution}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-gutter flex flex-col gap-space-xs">
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold line-clamp-1">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-space-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-[16px] text-outline">
                            calendar_today
                          </span>
                          <span className="font-code-sm text-code-sm">Disimpan: {item.createdDate}</span>
                        </div>
                        <div className="bg-surface-dim p-space-xs rounded flex items-center justify-between gap-2 overflow-hidden mt-1 border border-surface-variant/30">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="material-symbols-outlined text-[14px] text-tertiary shrink-0">
                              link
                            </span>
                            <span className="font-code-sm text-code-sm text-on-surface-variant truncate font-mono">
                              {item.payload}
                            </span>
                          </div>
                          <button
                            className="text-outline hover:text-on-surface p-1 shrink-0 transition-colors"
                            title="Salin URL"
                            onClick={() => {
                              navigator.clipboard.writeText(item.payload);
                              alert("URL disalin ke clipboard!");
                            }}
                          >
                            <span className="material-symbols-outlined text-[14px]">content_copy</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="px-gutter pb-gutter pt-0 flex items-center gap-space-xs">
                      <button
                        className="flex-1 bg-primary-container hover:bg-secondary-container text-on-primary-container py-2 px-3 rounded-lg font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-95"
                        onClick={() => openPushModal(item)}
                      >
                        <span className="material-symbols-outlined text-[18px]">cell_tower</span>
                        <span>Push ke Device</span>
                      </button>
                      <button
                        className="p-2 text-error hover:bg-error-container/20 rounded-lg transition-colors"
                        title="Hapus Konten"
                        onClick={() => handleDeleteContent(item)}
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Push Konten ke Device */}
        {pushModalOpen && selectedPushContent && (
          <div className="fixed inset-0 z-50 bg-surface-dim/80 backdrop-blur-sm flex items-center justify-center p-gutter animate-in fade-in duration-150">
            <div className="bg-surface-container max-w-lg w-full rounded-xl shadow-2xl p-gutter-md flex flex-col gap-space-md border border-surface-variant animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-space-xs">
                <div className="flex items-center gap-space-xs">
                  <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">cell_tower</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Push Konten ke Device
                    </h3>
                    <span className="font-code-sm text-code-sm text-tertiary">
                      Real-time WebSocket Broadcast
                    </span>
                  </div>
                </div>
                <button
                  className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg transition-colors"
                  onClick={() => setPushModalOpen(false)}
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Selected Payload with Direct Video Preview */}
              <div className="bg-surface-container-high p-space-md rounded-lg flex flex-col gap-2 border border-surface-variant/40">
                <div className="w-full aspect-video bg-surface-container-lowest rounded overflow-hidden relative">
                  <video
                    src={`${selectedPushContent.payload}#t=0.5`}
                    preload="metadata"
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                    Konten Terpilih:
                  </span>
                  <div className="font-headline-sm text-headline-sm text-on-surface font-medium truncate">
                    {selectedPushContent.title}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-code-sm text-code-sm text-secondary bg-surface-dim px-2 py-0.5 rounded font-mono">
                    VIDEO
                  </span>
                  <span className="font-code-sm text-code-sm text-on-surface-variant truncate font-mono">
                    {selectedPushContent.payload}
                  </span>
                </div>
              </div>

              {/* Target Device Selection */}
              <div className="flex flex-col gap-space-xs">
                <label
                  className="font-label-md text-label-md text-on-surface flex items-center justify-between"
                  htmlFor="targetDeviceSelect"
                >
                  <span>Target Perangkat:</span>
                  <span className="font-code-sm text-code-sm text-tertiary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                    {electronClients.length > 0 ? `${electronClients.length} Player Terhubung` : "Siap Kirim"}
                  </span>
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-dim text-on-surface rounded-lg px-space-md py-space-sm font-body-md text-body-md appearance-none focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer pr-10 border border-surface-variant/40"
                    id="targetDeviceSelect"
                    value={targetDevice}
                    onChange={(e) => setTargetDevice(e.target.value)}
                  >
                    <option value="ALL">Semua Device (Broadcast Seluruh Player)</option>
                    {deviceList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.id} ({d.lokasi})
                      </option>
                    ))}
                    {electronClients.map((client) => {
                      const alreadyInList = deviceList.some((d) => d.id === client.id);
                      if (alreadyInList) return null;
                      return (
                        <option key={client.id} value={client.id}>
                          {client.id} (Client Aktif)
                        </option>
                      );
                    })}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[20px]">
                    arrow_drop_down
                  </span>
                </div>
              </div>

              {pushFeedback && (
                <div className="p-space-sm rounded-lg bg-tertiary-container/30 text-on-tertiary-container font-code-sm text-code-sm flex items-center gap-2 border border-tertiary/20 animate-in fade-in">
                  <span className="material-symbols-outlined text-tertiary text-[18px]">
                    cloud_done
                  </span>
                  <span>{pushFeedback}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-space-sm pt-space-xs">
                <button
                  className="px-space-md py-space-sm rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  onClick={() => setPushModalOpen(false)}
                >
                  Batal
                </button>
                <button
                  className="bg-primary-container hover:bg-secondary-container text-on-primary-container px-space-md py-space-sm rounded-lg font-label-md text-label-md font-semibold flex items-center gap-space-xs transition-all shadow-md active:scale-95"
                  disabled={isDispatching}
                  onClick={handleExecutePush}
                >
                  {isDispatching ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-on-primary-container border-t-transparent animate-spin"></span>
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      <span>Kirim Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Media Preview Modal */}
        {previewItem && (
          <div className="fixed inset-0 z-50 bg-surface-dim/90 backdrop-blur-md flex items-center justify-center p-gutter animate-in fade-in duration-150">
            <div className="bg-surface-container max-w-2xl w-full rounded-xl shadow-2xl p-gutter-md flex flex-col gap-space-md border border-surface-variant animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    {previewItem.title}
                  </h3>
                  <span className="font-code-sm text-code-sm text-secondary truncate block max-w-md font-mono">
                    {previewItem.payload}
                  </span>
                </div>
                <button
                  className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
                  onClick={() => setPreviewItem(null)}
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="w-full aspect-video bg-surface-dim rounded-lg overflow-hidden flex items-center justify-center shadow-inner relative border border-surface-variant/40">
                <video
                  src={previewItem.payload}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                >
                  Browser Anda tidak mendukung streaming video.
                </video>
              </div>

              <div className="flex items-center justify-between text-code-sm text-on-surface-variant bg-surface-container-high px-space-md py-space-sm rounded-lg">
                <span className="text-tertiary flex items-center gap-1 font-mono">
                  <span className="material-symbols-outlined text-[16px]">speed</span>
                  Direct Hardware Accelerated Video Decoding
                </span>
                <a
                  href={previewItem.payload}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <span>Buka URL Langsung</span>
                  <span className="material-symbols-outlined text-[14px]">launch</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </SignageShell>
  );
}
