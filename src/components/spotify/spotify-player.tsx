"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Music, Loader2, LogOut, Link2, Check } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import {
  beginSpotifyAuth,
  disconnectSpotify,
  fetchPlaylists,
  fetchProfile,
  handleSpotifyRedirect,
  isSpotifyConfigured,
  isSpotifyConnected,
  playlistEmbedUrl,
  toEmbedUrl,
  type SpotifyPlaylist,
  type SpotifyProfile,
} from "@/lib/spotify";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorBoundary } from "@/components/error-boundary";
import { cn } from "@/lib/utils";

// Playlists públicas de concentración (no requieren vincular cuenta).
const PRESETS: { name: string; id: string }[] = [
  { name: "Lo-Fi Beats", id: "0vvXsWCC9xrXsKd4FyS8kM" },
  { name: "Deep Focus", id: "37i9dQZF1DWZeKCadgRdKQ" },
  { name: "Instrumental Study", id: "37i9dQZF1DX9sIqqvKsjG8" },
  { name: "Peaceful Piano", id: "37i9dQZF1DX4sWSpwq3LiO" },
];

function SpotifyPlayerInner() {
  const { spotifyUri, setSpotifyUri } = useStore();
  const [connected, setConnected] = useState(false);
  const [profile, setProfile] = useState<SpotifyProfile | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState("");

  const loadAccount = async () => {
    setLoading(true);
    const [prof, lists] = await Promise.all([fetchProfile(), fetchPlaylists()]);
    setProfile(prof);
    setPlaylists(lists);
    setLoading(false);
  };

  // Al montar: procesar el regreso de Spotify y/o restaurar sesión.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const justConnected = await handleSpotifyRedirect();
        if (!active) return;
        if (justConnected) toast.success("Spotify vinculado 🎧");
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Error al conectar Spotify";
        toast.error(msg, { duration: 10000 });
      }
      if (!active) return;
      if (isSpotifyConnected()) {
        setConnected(true);
        await loadAccount();
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const disconnect = () => {
    disconnectSpotify();
    setConnected(false);
    setProfile(null);
    setPlaylists([]);
    toast.success("Spotify desvinculado");
  };

  const useManual = () => {
    const url = toEmbedUrl(manual);
    if (!url) {
      toast.error("Pegá un link válido de Spotify (playlist, álbum o tema).");
      return;
    }
    setSpotifyUri(url);
    setManual("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Music className="h-4 w-4 text-emerald-500" />
              Música para concentrarte
            </CardTitle>
            <CardDescription>
              {connected && profile?.display_name
                ? `Conectado como ${profile.display_name}`
                : "Spotify · poné tu playlist de estudio"}
            </CardDescription>
          </div>
          {connected && (
            <Button variant="ghost" size="sm" onClick={disconnect}>
              <LogOut className="h-3.5 w-3.5" />
              Desvincular
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Reproductor */}
        {spotifyUri ? (
          <iframe
            title="Spotify"
            src={spotifyUri}
            width="100%"
            height={152}
            style={{ borderRadius: 12 }}
            frameBorder={0}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        ) : (
          <div className="flex h-[152px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-center text-sm text-muted-foreground">
            <Music className="h-6 w-6" />
            Elegí una playlist para empezar a sonar
          </div>
        )}

        {/* Cuenta de Spotify */}
        {isSpotifyConfigured ? (
          connected ? (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Tus playlists
              </p>
              {loading ? (
                <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando tus
                  playlists…
                </div>
              ) : playlists.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  No encontramos playlists en tu cuenta.
                </p>
              ) : (
                <ScrollArea className="h-44 rounded-lg border">
                  <ul className="divide-y">
                    {playlists.map((p) => {
                      const url = playlistEmbedUrl(p.id);
                      const active = spotifyUri === url;
                      return (
                        <li key={p.id}>
                          <button
                            onClick={() => setSpotifyUri(url)}
                            className={cn(
                              "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted",
                              active && "bg-primary/10",
                            )}
                          >
                            {p.images?.[0]?.url ? (
                              <Image
                                src={p.images[0].url}
                                alt=""
                                width={36}
                                height={36}
                                className="h-9 w-9 rounded object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded bg-muted">
                                <Music className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {p.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {p.tracks?.total ?? 0} temas
                              </p>
                            </div>
                            {active && (
                              <Check className="h-4 w-4 shrink-0 text-primary" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              )}
            </div>
          ) : (
            <Button onClick={() => void beginSpotifyAuth()} className="w-full">
              <Music className="h-4 w-4" />
              Vincular mi cuenta de Spotify
            </Button>
          )
        ) : (
          <p className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
            Para ver <span className="font-medium">tus</span> playlists, configurá
            el Client ID de Spotify (ver README). Mientras tanto, usá los presets o
            pegá un link.
          </p>
        )}

        {/* Presets */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Playlists de foco
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const url = playlistEmbedUrl(p.id);
              const active = spotifyUri === url;
              return (
                <Button
                  key={p.id}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSpotifyUri(url)}
                >
                  {p.name}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Link manual */}
        <div className="flex gap-2">
          <Input
            placeholder="Pegá un link de Spotify…"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && useManual()}
          />
          <Button variant="outline" onClick={useManual}>
            <Link2 className="h-4 w-4" />
            Usar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Fallback si el módulo de Spotify falla: no debe tumbar la página de Pomodoro. */
function SpotifyFallback() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Music className="h-4 w-4 text-emerald-500" />
          Música para concentrarte
        </CardTitle>
        <CardDescription>
          No pudimos cargar el reproductor de Spotify. El resto del pomodoro
          sigue funcionando normalmente.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export function SpotifyPlayer() {
  return (
    <ErrorBoundary fallback={<SpotifyFallback />}>
      <SpotifyPlayerInner />
    </ErrorBoundary>
  );
}
