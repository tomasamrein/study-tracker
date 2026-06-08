// Integración con Spotify mediante OAuth 2.0 con PKCE (sin client secret).
// El Client ID es público y se lee de NEXT_PUBLIC_SPOTIFY_CLIENT_ID.
// Si no está configurado, el reproductor sigue funcionando pegando un link.

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
export const isSpotifyConfigured = Boolean(CLIENT_ID);

const SCOPES =
  "playlist-read-private playlist-read-collaborative user-read-private";
const TOKEN_KEY = "study-tracker:spotify-tokens";
const VERIFIER_KEY = "study-tracker:spotify-verifier";
const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";

interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface SpotifyProfile {
  display_name: string | null;
  images: { url: string }[];
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { display_name: string };
}

function redirectUri(): string {
  return `${window.location.origin}/pomodoro`;
}

// ── PKCE helpers ────────────────────────────────────────────────────
function randomString(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
}

function base64url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ── Tokens ──────────────────────────────────────────────────────────
function saveTokens(data: {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}): void {
  const prev = loadTokens();
  const tokens: Tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? prev?.refresh_token ?? "",
    expires_at: Date.now() + data.expires_in * 1000,
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

function loadTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export function isSpotifyConnected(): boolean {
  return Boolean(loadTokens());
}

export function disconnectSpotify(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function getAccessToken(): Promise<string | null> {
  const t = loadTokens();
  if (!t || !CLIENT_ID) return null;
  if (Date.now() < t.expires_at - 60_000) return t.access_token;
  // Refrescar.
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: t.refresh_token,
      }),
    });
    if (!res.ok) {
      disconnectSpotify();
      return null;
    }
    const data = await res.json();
    saveTokens(data);
    return data.access_token as string;
  } catch {
    return null;
  }
}

// ── Flujo de autorización ───────────────────────────────────────────
export async function beginSpotifyAuth(): Promise<void> {
  if (!CLIENT_ID) return;
  const verifier = randomString(64);
  localStorage.setItem(VERIFIER_KEY, verifier);
  const challenge = base64url(await sha256(verifier));
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });
  window.location.href = `${AUTH_URL}?${params.toString()}`;
}

/** Procesa el `?code=` tras volver de Spotify. Devuelve true si conectó, lanza error con mensaje legible si falla. */
export async function handleSpotifyRedirect(): Promise<boolean> {
  if (!CLIENT_ID) return false;
  const url = new URL(window.location.href);

  // Spotify devuelve ?error= si el usuario cancela o hay un problema de configuración.
  const spotifyError = url.searchParams.get("error");
  if (spotifyError) {
    url.searchParams.delete("error");
    url.searchParams.delete("state");
    window.history.replaceState({}, "", url.pathname);
    throw new Error(
      spotifyError === "access_denied"
        ? "Cancelaste la autorización de Spotify."
        : `Spotify devolvió un error: ${spotifyError}`,
    );
  }

  const code = url.searchParams.get("code");
  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!code || !verifier) return false;

  // Limpiar la URL antes de hacer el fetch.
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, "", url.pathname);
  localStorage.removeItem(VERIFIER_KEY);

  const redirectUrl = redirectUri();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUrl,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const hint = (body as { error_description?: string }).error_description ?? res.statusText;
    // El error más común: el redirect_uri registrado en el Dashboard no coincide.
    if ((body as { error?: string }).error === "invalid_grant") {
      throw new Error(
        `El Redirect URI registrado en tu app de Spotify no coincide.\n` +
        `Asegurate de agregar exactamente: ${redirectUrl}`,
      );
    }
    throw new Error(`Error al obtener tokens de Spotify: ${hint}`);
  }

  saveTokens(await res.json());
  return true;
}

// ── API ─────────────────────────────────────────────────────────────
async function api<T>(path: string): Promise<T | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export async function fetchProfile(): Promise<SpotifyProfile | null> {
  return api<SpotifyProfile>("/me");
}

export async function fetchPlaylists(): Promise<SpotifyPlaylist[]> {
  const data = await api<{ items: SpotifyPlaylist[] }>(
    "/me/playlists?limit=50",
  );
  return (data?.items ?? []).filter(Boolean);
}

// ── Embed ───────────────────────────────────────────────────────────
const EMBED_TYPES = ["playlist", "album", "track", "artist", "show", "episode"];

/** Convierte un id de playlist o un link/URI de Spotify en URL de embed. */
export function toEmbedUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  // URI: spotify:playlist:ID
  const uriMatch = value.match(
    /spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]+)/,
  );
  if (uriMatch) return embed(uriMatch[1], uriMatch[2]);
  // URL: https://open.spotify.com/playlist/ID
  const urlMatch = value.match(
    /open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/,
  );
  if (urlMatch) return embed(urlMatch[1], urlMatch[2]);
  // Sólo un id → asumir playlist.
  if (/^[A-Za-z0-9]{16,}$/.test(value)) return embed("playlist", value);
  return null;
}

function embed(type: string, id: string): string | null {
  if (!EMBED_TYPES.includes(type)) return null;
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=study-tracker&theme=0`;
}

export function playlistEmbedUrl(id: string): string {
  return `https://open.spotify.com/embed/playlist/${id}?utm_source=study-tracker&theme=0`;
}
