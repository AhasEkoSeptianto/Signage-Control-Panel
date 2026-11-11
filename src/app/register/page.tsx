"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminRegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreement, setAgreement] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Kata sandi minimal harus 8 karakter.");
      return;
    }

    if (!agreement) {
      setErrorMessage("Anda harus menyetujui Ketentuan Layanan & Kebijakan Privasi.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setShowToast(true);

      // Redirect to login after 1.5 seconds
      setTimeout(() => {
        router.push("/login");
      }, 1500);
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

      {/* Main Registration Content */}
      <main className="w-full flex-1 flex flex-col items-center justify-center px-margin-md py-margin-lg">
        <div className="flex flex-col w-full items-center justify-center py-margin-md">
          {/* Subtle Ambient Glow Effect */}
          <div className="relative w-full max-w-xl">
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-32 bg-primary-container/20 rounded-full blur-3xl pointer-events-none -z-10"></div>

            {/* Registration Card */}
            <div className="w-full bg-surface-container-low rounded-xl shadow-xl p-margin-md sm:p-margin-lg border border-surface-variant/30">
              {/* Top Branding & Headers */}
              <div className="flex flex-col items-center text-center space-y-space-xs mb-margin-md">
                <div className="w-12 h-12 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary mb-space-xs shadow-sm">
                  <span className="material-symbols-outlined text-[28px]">monitor</span>
                </div>
                <div className="inline-flex items-center gap-space-xs px-space-sm py-0.5 rounded-full bg-surface-container text-secondary text-label-sm font-label-sm mb-space-xs border border-surface-variant/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                  <span>Sistem Manajemen Display Digital</span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold">
                  Registrasi Akun Admin
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                  Daftarkan akun administrator baru untuk mengelola fleet signage dan distribusi
                  konten multimedia secara terpusat.
                </p>
              </div>

              {/* Registration Form */}
              <form className="flex flex-col gap-space-md" onSubmit={handleRegister}>
                {errorMessage && (
                  <div className="p-2.5 rounded-lg bg-error-container/30 text-error font-body-sm text-center border border-error/20">
                    {errorMessage}
                  </div>
                )}

                {/* Field 1: Nama Lengkap */}
                <div className="flex flex-col gap-space-xs">
                  <label
                    className="font-label-md text-label-md text-on-surface flex items-center justify-between"
                    htmlFor="fullName"
                  >
                    <span>Nama Lengkap</span>
                    <span className="text-outline text-label-sm font-label-sm">Wajib</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-space-md text-outline pointer-events-none text-[20px]">
                      person
                    </span>
                    <input
                      className="w-full pl-11 pr-space-md py-2.5 rounded-lg bg-surface text-on-surface placeholder:text-outline font-body-md text-body-md outline-none focus:bg-surface-container transition-colors border border-surface-variant/30"
                      id="fullName"
                      placeholder="e.g. John Doe"
                      required
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Field 2: Email Perusahaan */}
                <div className="flex flex-col gap-space-xs">
                  <label
                    className="font-label-md text-label-md text-on-surface flex items-center justify-between"
                    htmlFor="email"
                  >
                    <span>Email Perusahaan / Instansi</span>
                    <span className="text-outline text-label-sm font-label-sm">
                      SSO / Domain Resmi
                    </span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-space-md text-outline pointer-events-none text-[20px]">
                      mail
                    </span>
                    <input
                      className="w-full pl-11 pr-space-md py-2.5 rounded-lg bg-surface text-on-surface placeholder:text-outline font-body-md text-body-md outline-none focus:bg-surface-container transition-colors border border-surface-variant/30"
                      id="email"
                      placeholder="admin@perusahaan.com"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Field 3 & 4: Password & Confirm Password (Grid on Desktop) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  {/* Password */}
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-on-surface" htmlFor="password">
                      Kata Sandi
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-space-md text-outline pointer-events-none text-[20px]">
                        lock
                      </span>
                      <input
                        className="w-full pl-11 pr-10 py-2.5 rounded-lg bg-surface text-on-surface placeholder:text-outline font-body-md text-body-md outline-none focus:bg-surface-container transition-colors border border-surface-variant/30"
                        id="password"
                        minLength={8}
                        placeholder="••••••••"
                        required
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        aria-label="Toggle password view"
                        className="absolute right-space-sm p-1 rounded hover:bg-surface-container-high text-outline text-[18px] transition-colors flex items-center justify-center"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                    <span className="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">info</span> Minimal 8
                      karakter &amp; simbol
                    </span>
                  </div>

                  {/* Confirm Password */}
                  <div className="flex flex-col gap-space-xs">
                    <label
                      className="font-label-md text-label-md text-on-surface"
                      htmlFor="confirmPassword"
                    >
                      Konfirmasi Kata Sandi
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-space-md text-outline pointer-events-none text-[20px]">
                        lock_clock
                      </span>
                      <input
                        className="w-full pl-11 pr-10 py-2.5 rounded-lg bg-surface text-on-surface placeholder:text-outline font-body-md text-body-md outline-none focus:bg-surface-container transition-colors border border-surface-variant/30"
                        id="confirmPassword"
                        minLength={8}
                        placeholder="••••••••"
                        required
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        aria-label="Toggle confirm password view"
                        className="absolute right-space-sm p-1 rounded hover:bg-surface-container-high text-outline text-[18px] transition-colors flex items-center justify-center"
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showConfirmPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Agreement Checkbox */}
                <div className="flex items-start gap-space-sm pt-space-xs">
                  <div className="relative flex items-center h-5 mt-0.5">
                    <input
                      className="w-4 h-4 rounded bg-surface text-primary-container focus:ring-0 cursor-pointer accent-primary-container"
                      id="agreement"
                      required
                      type="checkbox"
                      checked={agreement}
                      onChange={(e) => setAgreement(e.target.checked)}
                    />
                  </div>
                  <label
                    className="font-body-sm text-body-sm text-on-surface-variant cursor-pointer select-none"
                    htmlFor="agreement"
                  >
                    Saya menyetujui{" "}
                    <a className="text-primary hover:underline" href="#">
                      Ketentuan Layanan
                    </a>{" "}
                    serta{" "}
                    <a className="text-primary hover:underline" href="#">
                      Kebijakan Privasi
                    </a>{" "}
                    operasional armada SignageHub.
                  </label>
                </div>

                {/* Primary Action Button */}
                <button
                  className="w-full mt-space-xs py-3 px-margin-md rounded-lg bg-primary-container hover:bg-secondary-container text-on-primary-container font-label-md text-label-md font-semibold flex items-center justify-center gap-space-xs shadow-md transition-colors disabled:opacity-75"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">
                        progress_activity
                      </span>
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">person_add</span>
                      <span>Buat Akun Admin</span>
                    </>
                  )}
                </button>

                {/* Dynamic Success Toast */}
                {showToast && (
                  <div className="p-space-md rounded-lg bg-tertiary-container/30 text-on-tertiary-container font-body-sm text-body-sm flex items-center gap-space-sm border border-tertiary/20 animate-in fade-in">
                    <span className="material-symbols-outlined text-tertiary">check_circle</span>
                    <span>Pendaftaran berhasil diajukan! Mengalihkan ke konsol login...</span>
                  </div>
                )}
              </form>

              {/* Card Footer: Switch to Login */}
              <div className="mt-margin-md pt-margin-md flex flex-col sm:flex-row items-center justify-between text-on-surface-variant font-body-sm text-body-sm gap-space-xs bg-surface-container/40 p-space-md rounded-lg border border-surface-variant/20">
                <span>Sudah memiliki akun administrator?</span>
                <Link
                  className="text-primary hover:text-primary-fixed flex items-center gap-1 font-semibold group transition-colors"
                  href="/login"
                >
                  <span>Masuk di sini</span>
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>

            {/* Security Micro-telemetry Status Footer */}
            <div className="mt-space-md px-space-xs flex items-center justify-between text-outline font-code-sm text-code-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                <span className="uppercase">TLS 1.3 SECURE ENDPOINT</span>
              </div>
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>SHA-256 ENCRYPTED</span>
              </div>
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
