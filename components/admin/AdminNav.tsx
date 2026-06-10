"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  KeyRound,
  BarChart3,
  FileCode2,
  FolderKanban,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clientes", icon: Users },
  { href: "/admin/api", label: "API y modelos", icon: KeyRound },
  { href: "/admin/usage", label: "Consumo", icon: BarChart3 },
  { href: "/admin/prompts", label: "Prompts", icon: FileCode2 },
  { href: "/admin/projects", label: "Proyectos", icon: FolderKanban },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Módulos del panel">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14.5px] font-bold transition-colors duration-150 ease-snap",
              active
                ? "bg-navy-800 text-white"
                : "text-navy-300 hover:bg-navy-800/60 hover:text-white",
            )}
          >
            {active && (
              <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-cyan-400" />
            )}
            <Icon
              className={cn("h-[18px] w-[18px]", active ? "text-cyan-400" : "")}
              strokeWidth={2}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
