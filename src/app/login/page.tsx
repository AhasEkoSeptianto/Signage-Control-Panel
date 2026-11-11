"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("admin@signagehub.id");
  const [password, setPassword] = useState("admin12345");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setAuthError(null);

    // Simulated auth verification
    setTimeout(() => {
      setIsLoading(false);
      // Route to dashboard
      router.push("/");
    }, 900);
  };

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface min-h-screen flex flex-col justify-between items-center selection:bg-primary-container selection:text-on-primary-container">
      {/* Top Header */}
      <header className="w-full flex items-center justify-between px-margin-lg py-margin-md max-w-7xl">
        <Link href="/" className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            <span className="material-symbols-outlined text-[20px]">tv</span>
          </div>
          <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-semibold">
            SignageHub
          </span>
        </Link>
        <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
          <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
          <span className="font-code-sm text-code-sm uppercase tracking-wide">
            Fleet Telemetry v2.4
          </span>
        </div>
      </header>

      {/* Main Authentication Section */}
      <main className="w-full flex-1 flex flex-col items-center justify-center px-margin-md py-margin-lg">
        <div className="flex flex-col w-full items-center justify-center py-margin-md relative">
          {/* Ambient background glow elements */}
          <div className="absolute w-96 h-96 rounded-full bg-secondary-container/10 blur-3xl pointer-events-none -top-20 -left-20"></div>
          <div className="absolute w-80 h-80 rounded-full bg-tertiary-container/10 blur-3xl pointer-events-none -bottom-24 -right-20"></div>

          {/* Central Authentication Wrapper */}
          <div className="w-full max-w-md relative z-10">
            {/* Elevated Hardware Console Card */}
            <div className="bg-surface-container-low rounded-xl p-margin-lg shadow-xl relative overflow-hidden border border-surface-variant/30">
              {/* Top Subtle Status Beacon */}
              <div className="flex items-center justify-between pb-space-md mb-space-lg border-b border-surface-variant/20">
                <div className="flex items-center gap-space-xs bg-surface-container-high px-space-sm py-1 rounded-full text-on-surface-variant font-code-sm text-code-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                  <span>GATEWAY::ACTIVE</span>
                </div>
                <span className="font-code-sm text-code-sm text-outline tracking-wider">
                  SEC-PORT: 443
                </span>
              </div>

              {/* Header Section */}
              <div className="flex flex-col items-center text-center mb-space-xl">
                <div className="w-14 h-14 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container shadow-md mb-space-md">
                  <span className="material-symbols-outlined text-3xl">desktop_windows</span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold">
                  Masuk ke Dashboard Admin
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs max-w-xs">
                  Kelola perangkat signage dan streaming video secara terpusat
                </p>
              </div>

              {/* Authentication Form */}
              <form className="flex flex-col gap-space-md" onSubmit={handleLogin}>
                {authError && (
                  <div className="p-2.5 rounded-lg bg-error-container/30 text-error font-body-sm text-center border border-error/20">
                    {authError}
                  </div>
                )}

                {/* Input Field: Email */}
                <div className="flex flex-col gap-space-xs text-left">
                  <label
                    className="font-label-md text-label-md text-on-surface font-medium flex items-center justify-between"
                    htmlFor="admin-email"
                  >
                    <span>Email Admin</span>
                    <span className="font-code-sm text-code-sm text-outline">ID::Kredensial</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-space-md text-outline pointer-events-none text-xl">
                      alternate_email
                    </span>
                    <input
                      autoComplete="email"
                      className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-md text-body-md pl-11 pr-space-md py-3 rounded-lg outline-none transition-all duration-200 focus:bg-surface-container-high border border-surface-variant/30"
                      id="admin-email"
                      name="email"
                      placeholder="admin@signagehub.id"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Input Field: Kata Sandi */}
                <div className="flex flex-col gap-space-xs text-left">
                  <div className="flex items-center justify-between">
                    <label
                      className="font-label-md text-label-md text-on-surface font-medium"
                      htmlFor="admin-password"
                    >
                      Kata Sandi
                    </label>
                    <a
                      className="font-label-sm text-label-sm text-secondary hover:text-on-secondary-container transition-colors"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        alert("Silakan hubungi Super Admin untuk reset kredensial.");
                      }}
                    >
                      Lupa kata sandi?
                    </a>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-space-md text-outline pointer-events-none text-xl">
                      lock
                    </span>
                    <input
                      autoComplete="current-password"
                      className={`w-full bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-md text-body-md pl-11 pr-11 py-3 rounded-lg outline-none transition-all duration-200 focus:bg-surface-container-high border border-surface-variant/30 ${
                        !showPassword ? "tracking-widest" : ""
                      }`}
                      id="admin-password"
                      name="password"
                      placeholder="••••••••"
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      aria-label="Tampilkan atau sembunyikan kata sandi"
                      className="absolute right-space-sm p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-variant transition-colors flex items-center justify-center"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Form Features: Remember Me */}
                <div className="flex items-center justify-between py-space-xs">
                  <label className="flex items-center gap-space-sm cursor-pointer select-none group">
                    <input
                      className="w-4 h-4 rounded bg-surface-container-lowest text-primary-container focus:ring-0 focus:outline-none cursor-pointer accent-primary-container"
                      id="remember-device"
                      name="remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface transition-colors">
                      Ingat saya di perangkat ini
                    </span>
                  </label>
                </div>

                {/* Primary CTA Button */}
                <button
                  className="w-full bg-primary-container hover:bg-secondary-container text-on-primary-container font-label-md text-label-md font-semibold py-3 px-space-md rounded-lg flex items-center justify-center gap-space-sm shadow-md transition-all duration-200 active:scale-[0.99] group mt-space-xs disabled:opacity-75"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                      <span>Memverifikasi Akses...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Dashboard</span>
                      <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </form>

              {/* Security Notice Badge */}
              <div className="mt-space-lg bg-surface-container rounded-lg p-space-sm flex items-center justify-center gap-space-xs text-center border border-surface-variant/20">
                <span className="material-symbols-outlined text-tertiary text-base">
                  verified_user
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Autentikasi Terproteksi JWT &amp; Sesi Terenkripsi
                </span>
              </div>
            </div>

            {/* Alternative Action / Switch to Registration */}
            <div className="mt-space-md text-center">
              <p className="font-body-md text-body-md text-on-surface-variant">
                Belum memiliki akun admin?{" "}
                <Link
                  className="font-medium text-primary hover:text-on-primary-container transition-colors ml-1"
                  href="/register"
                >
                  Daftar Sekarang
                </Link>
              </p>
            </div>

            {/* Operational Telemetry Micro-Pill */}
            <div className="mt-space-lg flex items-center justify-center gap-space-sm opacity-60 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1.5 font-code-sm text-code-sm text-outline">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                <span>LATENCY: 18ms</span>
              </div>
              <span className="text-outline-variant font-code-sm text-code-sm">•</span>
              <div className="font-code-sm text-code-sm text-outline">NODES: ONLINE</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-margin-md flex flex-col sm:flex-row items-center justify-between px-margin-lg max-w-7xl text-on-surface-variant font-label-sm text-label-sm gap-space-sm">
        <div>© 2025 SignageHub Inc. All rights reserved.</div>
        <div className="flex items-center gap-space-md">
          <a className="hover:text-on-surface transition-colors" href="#">
            Security Protocol
          </a>
          <span className="text-outline-variant">•</span>
          <a className="hover:text-on-surface transition-colors" href="#">
            Fleet Status
          </a>
          <span className="text-outline-variant">•</span>
          <a className="hover:text-on-surface transition-colors" href="#">
            Terms of Service
          </a>
        </div>
      </footer>
    </div>
  );
}
