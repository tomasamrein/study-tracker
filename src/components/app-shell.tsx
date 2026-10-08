"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CircleDot,
  Flame,
  Goal,
  ListTodo,
  LogOut,
  Moon,
  Ellipsis,
  Sun,
  Timer,
  CandlestickChart,
  NotebookPen,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { usePomodoroContext } from "@/lib/pomodoro-context";
import { BrandIcon } from "@/components/brand-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV = [
  { href: "/", label: "Hoy", icon: CircleDot, mobile: true },
  { href: "/enfoque", label: "Deep work", icon: Timer, mobile: true },
  { href: "/diario", label: "Diario", icon: NotebookPen, mobile: true },
  { href: "/habitos", label: "Hábitos", icon: Flame, mobile: true },
  { href: "/trading", label: "Trading", icon: CandlestickChart, mobile: false },
  { href: "/tareas", label: "Tareas", icon: ListTodo, mobile: false },
  { href: "/metas", label: "Metas", icon: Goal, mobile: false },
  { href: "/estudio", label: "Carrera", icon: BookOpen, mobile: false },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3, mobile: false },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const current = NAV.find((n) => isActive(pathname, n.href));

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-60 md:flex-col md:border-r md:bg-sidebar">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <BrandIcon className="h-7 w-7" iconClassName="h-4 w-4" />
          <span className="display text-3xl">Foco</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-3">
          <TimerPill className="mb-2 w-full" />
          <UserCard />
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <BrandIcon className="h-6 w-6 rounded-md" iconClassName="h-3.5 w-3.5" />
            <span className="display text-2xl">Foco</span>
          </div>
          <p className="eyebrow hidden md:block">{current?.label ?? "Foco"}</p>
          <div className="flex items-center gap-1">
            <TimerPill className="md:hidden" />
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
              <TooltipContent>
                Tema {theme === "dark" ? "claro" : "oscuro"}
              </TooltipContent>
            </Tooltip>
          </div>
        </header>

        <main className="flex-1 px-4 pt-6 pb-24 md:px-8 md:py-10">{children}</main>
      </div>

      {/* Nav inferior (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.filter((n) => n.mobile).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              {item.label}
            </Link>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] outline-none",
              NAV.some((n) => !n.mobile && isActive(pathname, n.href))
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            <Ellipsis className="h-5 w-5" strokeWidth={1.75} />
            Más
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-44">
            {NAV.filter((n) => !n.mobile).map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  );
}

/** Muestra el timer en curso desde cualquier página. */
function TimerPill({ className }: { className?: string }) {
  const pomo = usePomodoroContext();
  const pathname = usePathname();
  const sw = pomo.stopwatch;
  if ((!pomo.running && !sw.running) || pathname.startsWith("/enfoque")) return null;
  const mm = String(Math.floor(pomo.remaining / 60)).padStart(2, "0");
  const ss = String(pomo.remaining % 60).padStart(2, "0");
  const text = sw.running
    ? `Cronómetro ${sw.clock}`
    : `${pomo.phase === "focus" ? "Foco" : "Descanso"} ${mm}:${ss}`;
  return (
    <Link
      href="/enfoque"
      className={cn(
        "flex items-center justify-center gap-2 rounded-md border px-2.5 py-1.5 font-mono text-xs tabular-nums",
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-foreground" />
      </span>
      {text}
    </Link>
  );
}

function UserCard() {
  const { cloud, user, signOut } = useAuth();
  if (!cloud || !user) return null;
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
      {user.photoURL ? (
        <Image
          src={user.photoURL}
          alt={user.name ?? "Usuario"}
          width={26}
          height={26}
          className="h-6 w-6 rounded-full grayscale"
        />
      ) : (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-xs font-medium">{user.name ?? "Cuenta"}</p>
        <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
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
