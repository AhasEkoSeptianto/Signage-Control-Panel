-- ====================================================================
-- SCHEMA KONSISTENSI SIGNAGEHUB (SUPABASE POSTGRESQL)
-- Hanya 2 Tabel: devices & contents
-- Salin dan jalankan seluruh query ini di Supabase SQL Editor
-- ====================================================================

-- 1. TABEL: devices (id, nama, lokasi, status, last_seen)
CREATE TABLE devices (
    id VARCHAR(255) PRIMARY KEY,
    nama VARCHAR(255) NOT NULL DEFAULT 'Display Signage',
    lokasi VARCHAR(255) NOT NULL DEFAULT 'Gedung Utama',
    status VARCHAR(50) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy')),
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL: contents (id, judul, tipe, payload, url, created_at)
CREATE TABLE contents (
    id VARCHAR(255) PRIMARY KEY,
    judul VARCHAR(255) NOT NULL,
    tipe VARCHAR(50) NOT NULL DEFAULT 'video',
    payload TEXT NOT NULL,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to devices" 
    ON devices FOR ALL 
    USING (true) 
    WITH CHECK (true);

ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to contents" 
    ON contents FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- 4. DATA SAMPLE AWAL
INSERT INTO devices (id, nama, lokasi, status) VALUES
    ('DEV-01', 'Layar Lobby Utama', 'Gedung A - Lantai 1', 'offline'),
ON CONFLICT (id) DO NOTHING;


-- 5. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
