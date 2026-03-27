"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileSpreadsheet, Bot } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planilha", label: "Planilha", icon: FileSpreadsheet },
  { href: "/kyoto", label: "Kyoto", icon: Bot },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed top-0 left-0 h-screen w-[220px] border-r flex flex-col"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="p-6">
        <h1
          className="text-xl font-bold tracking-widest"
          style={{ fontFamily: "'Space Mono', monospace", color: "var(--accent)" }}
        >
          KYOTO
        </h1>
      </div>

      <div className="flex flex-col gap-1 px-3 mt-4">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "text-white" : ""
              }`}
              style={{
                backgroundColor: isActive ? "var(--accent)" : "transparent",
                color: isActive ? "#fff" : "var(--muted)",
              }}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
