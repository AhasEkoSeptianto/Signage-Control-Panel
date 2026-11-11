-- ==============================================================================
-- Schema Supabase: SignageHub (Next.js + WebSocket + Electron Fleet Hub)
-- Tabel: devices (id, lokasi, status, last_seen, current_playing, created_at, metadata)
-- Tabel: contents (id, judul, tipe, payload/url, created_at)
-- 
-- Sesuai instruksi: Data 'nama node' / 'device_name' / 'nama' DIHAPUS TOTAL dari tabel dan project.
-- Perangkat diidentifikasi secara unik oleh 'id' dan 'lokasi'.
-- ==============================================================================

-- 1. Enable UUID Extension jika belum aktif
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL: devices
CREATE TABLE IF NOT EXISTS public.devices (
    id TEXT PRIMARY KEY,
    lokasi TEXT NOT NULL DEFAULT 'Gedung Utama',
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy')),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    current_playing TEXT DEFAULT 'Idle / Standby',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Hapus kolom lama yang tidak digunakan (nama node, device_name, location)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='devices' AND column_name='nama') THEN
        ALTER TABLE public.devices DROP COLUMN nama;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='devices' AND column_name='device_name') THEN
        ALTER TABLE public.devices DROP COLUMN device_name;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='devices' AND column_name='location') THEN
        ALTER TABLE public.devices DROP COLUMN location;
    END IF;

    -- Pastikan kolom lokasi ada
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='devices' AND column_name='lokasi') THEN
        ALTER TABLE public.devices ADD COLUMN lokasi TEXT NOT NULL DEFAULT 'Gedung Utama';
    END IF;

    -- Pastikan kolom current_playing ada
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='devices' AND column_name='current_playing') THEN
        ALTER TABLE public.devices ADD COLUMN current_playing TEXT DEFAULT 'Idle / Standby';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_devices_status ON public.devices (status);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON public.devices (last_seen DESC);

-- 3. TABEL: contents (Katalog media video & signage display)
CREATE TABLE IF NOT EXISTS public.contents (
    id TEXT PRIMARY KEY,
    judul TEXT NOT NULL,
    tipe TEXT NOT NULL DEFAULT 'video',
    payload TEXT NOT NULL,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrasi kolom contents jika tabel sebelumnya dibuat dengan title/type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contents' AND column_name='judul') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contents' AND column_name='title') THEN
            ALTER TABLE public.contents ADD COLUMN judul TEXT;
            UPDATE public.contents SET judul = title WHERE judul IS NULL;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contents' AND column_name='tipe') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contents' AND column_name='type') THEN
            ALTER TABLE public.contents ADD COLUMN tipe TEXT;
            UPDATE public.contents SET tipe = type WHERE tipe IS NULL;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contents' AND column_name='url') THEN
        ALTER TABLE public.contents ADD COLUMN url TEXT;
        UPDATE public.contents SET url = payload WHERE url IS NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contents_created_at ON public.contents (created_at DESC);

-- 4. TABEL: desktop_commands (Perintah real-time dari Web ke Electron)
CREATE TABLE IF NOT EXISTS public.desktop_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    command TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'executed', 'failed')),
    result JSONB DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    executed_at TIMESTAMPTZ DEFAULT NULL
);

-- 5. Row Level Security (RLS) Configuration
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desktop_commands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all on devices" ON public.devices;
CREATE POLICY "Allow anon all on devices" 
ON public.devices FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on contents" ON public.contents;
CREATE POLICY "Allow anon all on contents" 
ON public.contents FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on desktop_commands" ON public.desktop_commands;
CREATE POLICY "Allow anon all on desktop_commands" 
ON public.desktop_commands FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 6. Supabase Realtime Setup
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'devices'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'contents'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.contents;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'desktop_commands'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.desktop_commands;
    END IF;
END $$;

-- 7. Seed Data Tanpa Nama Node
INSERT INTO public.devices (id, lokasi, status, current_playing, last_seen)
VALUES
    ('DEV-01', 'Gedung A - Lantai 1', 'online', 'Video Promo Diskon Spesial', NOW()),
    ('DEV-02', 'Kantin Lt. 2', 'online', 'Daftar Menu Siang', NOW()),
    ('DEV-03', 'Gedung B - Ruang 301', 'offline', '-', NOW() - INTERVAL '15 minutes'),
    ('DEV-04', 'Lobi Belakang', 'online', 'Pengumuman Internal', NOW())
ON CONFLICT (id) DO UPDATE SET
    lokasi = EXCLUDED.lokasi,
    status = EXCLUDED.status,
    current_playing = EXCLUDED.current_playing,
    last_seen = EXCLUDED.last_seen;

INSERT INTO public.contents (id, judul, tipe, payload, url)
VALUES
    ('content-1', 'Video Promo Diskon Spesial', 'video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'),
    ('content-2', 'Company Profile 4K Showcase', 'video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'),
    ('content-3', 'Menu Seasonal Video Teaser', 'video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4')
ON CONFLICT (id) DO UPDATE SET
    judul = EXCLUDED.judul,
    tipe = EXCLUDED.tipe,
    payload = EXCLUDED.payload,
    url = EXCLUDED.url;
