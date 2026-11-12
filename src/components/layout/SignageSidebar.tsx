"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SignageSidebarProps {
  supabaseConnected?: boolean;
}

export function SignageSidebar({ supabaseConnected = true }: SignageSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Devices & Fleet",
      href: "/",
      icon: "devices",
      active: pathname === "/" || pathname === "/devices",
    },
    {
      label: "Content & Media",
      href: "/content",
      icon: "perm_media",
      active: pathname.startsWith("/content"),
    },
    {
      label: "Simulasi Player",
      href: "/simulation",
      icon: "smart_display",
      active: pathname.startsWith("/simulation"),
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.25)]">
      <div className="flex flex-col">
        {/* Brand Header */}
        <Link href="/" className="h-16 px-gutter-md flex items-center gap-space-sm hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container shadow-sm">
            <span className="material-symbols-outlined text-[20px]">tv</span>
          </div>
          <span className="font-headline-md text-headline-md tracking-tight text-on-surface font-semibold">
            SignageHub
          </span>
        </Link>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-space-xs px-gutter mt-2">
          {navItems.map((item) => {
            const isActive = item.active;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-space-sm px-gutter py-space-sm rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary-container text-on-primary-container font-semibold shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-label-md text-label-md">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Realtime Status */}
      <div className="p-gutter flex flex-col gap-space-xs">
        <div className="bg-surface-container px-space-md py-space-sm rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-outline text-[16px]">storage</span>
            <span className="font-code-sm text-code-sm text-on-surface-variant">Supabase Realtime</span>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              supabaseConnected ? "bg-tertiary" : "bg-error"
            }`}
            title={supabaseConnected ? "Supabase Connected" : "Supabase Offline"}
          />
        </div>

        <div className="px-space-xs pt-1 flex items-center justify-between text-outline font-code-sm text-code-sm text-[11px]">
          <span>Fleet Core v2.4</span>
          <Link href="/login" className="hover:text-primary transition-colors">
            Logout
          </Link>
        </div>
      </div>
    </aside>
  );
}
