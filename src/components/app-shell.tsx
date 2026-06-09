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
  { href: "/plan", label: "Plan de estudios", icon: GraduationCap },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { backend } = useStore();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-card/40 md:backdrop-blur">
        <div className="flex h-16 items-center gap-2.5 border-b px-6">
          <BrandIcon className="h-9 w-9" />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Study Tracker</p>
            <p className="text-xs text-muted-foreground">Ing. Informática</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
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
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t p-3">
          <UserCard />
          <BackendBadge backend={backend} />
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <BrandIcon className="h-8 w-8 rounded-lg" iconClassName="h-4 w-4" />
            <span className="text-sm font-semibold tracking-tight">
              Study Tracker
            </span>
          </div>
          <div className="hidden items-center gap-2.5 md:flex">
            <BrandIcon className="h-8 w-8 rounded-lg" iconClassName="h-4 w-4" />
            <p className="text-sm font-medium">
              {NAV.find((n) =>
                n.href === "/" ? pathname === "/" : pathname.startsWith(n.href),
              )?.label ?? "Study Tracker"}
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                aria-label="Cambiar tema"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cambiar a tema {theme === "dark" ? "claro" : "oscuro"}</TooltipContent>
          </Tooltip>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      {/* Nav inferior (mobile) */}
      <nav className="sticky bottom-0 z-30 grid grid-cols-5 border-t bg-background/90 backdrop-blur md:hidden">
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
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 py-2">
      {user.photoURL ? (
        <Image
          src={user.photoURL}
          alt={user.name ?? "Usuario"}
          width={28}
          height={28}
          className="h-7 w-7 rounded-full"
        />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-xs font-medium">{user.name ?? "Cuenta"}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {user.email}
        </p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => void signOut()}
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Cerrar sesión</TooltipContent>
      </Tooltip>
    </div>
  );
}

function BackendBadge({ backend }: { backend: "firebase" | "local" }) {
  const isFirebase = backend === "firebase";
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isFirebase ? "bg-emerald-500" : "bg-amber-500",
        )}
      />
      <span className="text-muted-foreground">
        {isFirebase ? "Firebase conectado" : "Datos locales"}
      </span>
    </div>
  );
}
