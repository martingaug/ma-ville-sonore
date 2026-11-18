import { coverImage } from "./covers.mjs";
import { createHash } from 'node:crypto';
import { artistProfile, artistPhoto } from "./artists.mjs";
import http from "node:http";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";

const USER = process.env.LASTFM_USER || "elleaimeRT";
const KEY = process.env.LASTFM_API_KEY;
const PORT = Number(process.env.PORT || 3000);

const CACHE_DURATION = 3 * 60 * 1000;
const RETRY_DELAY = 60 * 1000;
const CACHE_FILE = "/app/data/recent-tracks.json";

let cache = null;
let pending = null;
let retryAfter = 0;
let warning = null;

// Retrouver les données sauvegardées lors du précédent lancement.
try {
  const saved = JSON.parse(await readFile(CACHE_FILE, "utf8"));
  if (
    saved.user === USER &&
    Array.isArray(saved.tracks) &&
    Number.isFinite(saved.updatedAt) && saved.tracks.every(t => Object.hasOwn(t, "coverSource"))
  ) {
    cache = saved;
  }
} catch {
  // Au premier lancement, aucun fichier n'existe encore.
}

async function refreshTracks() {
  try {
    if (!KEY) {
      throw new Error("Configuration manquante");
    }

    const url = new URL("https://ws.audioscrobbler.com/2.0/");
    url.search = new URLSearchParams({
      method: "user.getrecenttracks",
      user: USER,
      api_key: KEY,
      format: "json",
      limit: "200",
    });

    console.log("Appel Last.fm");

    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error("Réponse HTTP invalide");
    }

    const data = await response.json();

    if (data.error || !Array.isArray(data.recenttracks?.track)) {
      throw new Error("Réponse Last.fm invalide");
    }

    cache = {
      user: USER,
      updatedAt: Date.now(),
      tracks: data.recenttracks.track.map((track) => ({
        artist: track.artist["#text"],
        coverSource: track.image?.find(i => i.size === "extralarge")?.["#text"] || track.image?.findLast(i => i["#text"])?.["#text"] || null,
        coverId: createHash("sha256").update((track.artist["#text"] || "") + "|" + (track.album["#text"] || track.name)).digest("hex"),
        title: track.name,
        album: track.album["#text"],
        playedAt: track.date?.uts
          ? Number(track.date.uts) * 1000
          : null,
        nowPlaying: track["@attr"]?.nowplaying === "true",
      })),
    };

    warning = null;
    retryAfter = 0;

    try {
      await mkdir("/app/data", { recursive: true });
      await writeFile(CACHE_FILE + ".tmp", JSON.stringify(cache));
      await rename(CACHE_FILE + ".tmp", CACHE_FILE);
    } catch {
      console.log("Sauvegarde disque indisponible ; cache mémoire conservé.");
    }
  } catch {
    // Ne pas afficher l'erreur complète : elle pourrait contenir la clé.
    warning = KEY
      ? "Impossible de récupérer les écoutes. Vérifie Last.fm et la configuration."
      : "Ajoute ta clé Last.fm dans le fichier .env.";

    retryAfter = Date.now() + RETRY_DELAY;
  }
}

async function getTracks() {
  const expired =
    !cache || Date.now() - cache.updatedAt >= CACHE_DURATION;

  if (expired && Date.now() >= retryAfter) {
    // Les visiteurs simultanés partagent le même appel Last.fm.
    if (!pending) {
      pending = refreshTracks().finally(() => {
        pending = null;
      });
    }
    await pending;
  }

  return {
    user: USER,
    updatedAt: cache?.updatedAt ?? null,
    stale: Boolean(warning && cache),
    message: warning,
    tracks: (cache?.tracks ?? []).map(({coverSource, ...track}) => ({...track, coverUrl: coverSource ? "/api/cover?id=" + track.coverId : null})),
  };
}

const server = http.createServer(async (request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;

  if (request.method !== "GET") {
    response.writeHead(405);
    response.end("Méthode non autorisée");
    return;
  }

  if (path === "/api/recent-tracks") {
    const result = await getTracks();

    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify(result, null, 2));
    return;
  }

  if (path === "/api/artist" || path === "/api/artist-photo") {
    const name = new URL(request.url, "http://localhost").searchParams.get("name") || "";
    const allowed = new Set(["luvbfk", "maitrecorbeau", ...(cache?.tracks || []).map(t => t.artist.toLowerCase())]);
    if (!name || name.length > 200 || !allowed.has(name.toLowerCase())) {
      response.writeHead(404); response.end("Artiste absent des écoutes"); return;
    }
    try {
      if (path === "/api/artist") {
        const profile = await artistProfile(name);
        response.writeHead(200, {"Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store"});
        response.end(JSON.stringify(profile));
      } else {
        const photo = await artistPhoto(name);
        if (!photo) {response.writeHead(404);response.end("Photo indisponible");return;}
        response.writeHead(200, {"Content-Type":photo.type,"Cache-Control":"private, max-age=3600","X-Content-Type-Options":"nosniff"});response.end(photo.body);
      }
    } catch {response.writeHead(503);response.end("Portrait temporairement indisponible");}
    return;
  }
  if (path === "/api/cover") {
    const id = new URL(request.url, "http://localhost").searchParams.get("id");
    const track = cache?.tracks.find(t => t.coverId === id);
    const image = await coverImage(track?.coverSource);
    if (!image) {response.writeHead(404);response.end("Pochette indisponible");return;}
    response.writeHead(200,{"Content-Type":image.type,"Cache-Control":"public,max-age=3600","X-Content-Type-Options":"nosniff"});response.end(image.body);return;
  }
  const files = {
    "/": ["index.html", "text/html; charset=utf-8"],
    "/style.css": ["style.css", "text/css; charset=utf-8"],
    "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  };
  if (Object.hasOwn(files, path)) {
    const [name, type] = files[path];
    try {
      const body = await readFile(new URL(`./public/${name}`, import.meta.url));
      response.writeHead(200, {
        "Content-Type": type,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      });
      response.end(body);
    } catch {
      response.writeHead(500);
      response.end("Fichier de la ville indisponible.");
    }
    return;
  }
  response.writeHead(404);
  response.end("Page introuvable");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur prêt sur le port ${PORT}`);
});