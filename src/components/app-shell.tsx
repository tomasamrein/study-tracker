"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  GraduationCap,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Moon,
  Sun,
  Timer,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { BrandIcon } from "@/components/brand-icon";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pomodoro", label: "Pomodoro", icon: Timer },
  { href: "/todos", label: "Tareas", icon: ListTodo },
  { href: "/plan", label: "Plan", icon: GraduationCap },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:bg-sidebar">
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5">
          <BrandIcon className="h-8 w-8" iconClassName="h-4 w-4" />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Study Tracker</p>
            <p className="text-[11px] text-sidebar-foreground/60">Panel de control</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-2.5">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-sidebar-border p-2.5">
          <UserCard />
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <BrandIcon className="h-7 w-7 rounded-lg" iconClassName="h-3.5 w-3.5" />
            <span className="text-sm font-semibold tracking-tight">
              Study Tracker
            </span>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <p className="text-sm font-medium text-muted-foreground">
              {NAV.find((n) =>
                n.href === "/" ? pathname === "/" : pathname.startsWith(n.href),
              )?.label ?? "Study Tracker"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggle}
                  aria-label="Cambiar tema"
                  className="text-muted-foreground"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cambiar a tema {theme === "dark" ? "claro" : "oscuro"}</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>

      {/* Nav inferior (mobile) */}
      <nav className="sticky bottom-0 z-30 grid grid-cols-6 border-t bg-background/90 backdrop-blur md:hidden">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function UserCard() {
  const { cloud, user, signOut } = useAuth();
  if (!cloud || !user) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
      {user.photoURL ? (
        <Image
          src={user.photoURL}
          alt={user.name ?? "Usuario"}
          width={26}
          height={26}
          className="h-6 w-6 rounded-full"
        />
      ) : (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
          {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-xs font-medium text-sidebar-foreground">
          {user.name ?? "Cuenta"}
        </p>
        <p className="truncate text-[10px] text-sidebar-foreground/50">
          {user.email}
        </p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground"
            onClick={() => void signOut()}
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Cerrar sesión</TooltipContent>
      </Tooltip>
    </div>
  );
}
