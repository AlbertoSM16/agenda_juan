"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, Car, LayoutDashboard, ListOrdered, LogOut, Settings, Wallet } from "lucide-react";
import { logout } from "@/app/actions";
import { cx } from "@/components/ui";

const LINKS = [
  { href: "/", label: "Mes", icon: LayoutDashboard },
  { href: "/movimientos", label: "Movimientos", icon: ListOrdered },
  { href: "/anual", label: "Anual", icon: CalendarRange },
  { href: "/vehiculos", label: "Vehículos", icon: Car },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

export function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      {/* Escritorio */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-border bg-surface px-3 py-5 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
            <Wallet size={16} />
          </span>
          <span className="font-semibold tracking-tight">Personal Hub</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cx(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                active(href) ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <form action={logout}>
          <button className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-text">
            <LogOut size={17} /> Salir
          </button>
        </form>
      </aside>

      {/* Móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cx(
              "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
              active(href) ? "text-accent" : "text-muted",
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
