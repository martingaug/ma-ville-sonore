const images = new Map();
const pending = new Map();
const hosts = new Set([
  "lastfm.freetls.fastly.net", "lastfm-img2.akamaized.net",
  "userserve-ak.last.fm", "static.last.fm",
]);
const placeholder = /2a96cbd8b46e442fc41c2b86b821562f/i;

function imageAddress(value) {
  try {
    const url = new URL(value);
    if (!hosts.has(url.hostname) || url.username || url.password || url.port ||
        !["http:", "https:"].includes(url.protocol) || placeholder.test(url.pathname)) return null;
    url.protocol = "https:";
    return url;
  } catch {
    return null;
  }
}

async function download(address) {
  let url = imageAddress(address);
  const signal = AbortSignal.timeout(5000);
  for (let hop = 0; url && hop < 4; hop++) {
    const response = await fetch(url, { redirect: "manual", signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      url = location ? imageAddress(new URL(location, url)) : null;
      continue;
    }
    const type = response.headers.get("content-type")?.split(";")[0];
    if (!response.ok || !["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(type)) {
      await response.body?.cancel();
      return null;
    }
    const chunks = [];
    let total = 0;
    for await (const chunk of response.body) {
      total += chunk.length;
      if (total > 2000000) return null;
      chunks.push(chunk);
    }
    return total ? { body: Buffer.concat(chunks), type } : null;
  }
  return null;
}

async function findCover(track, key) {
  const direct = await download(track.coverSource).catch(() => null);
  if (direct || !track.album || !key) return direct;
  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.search = new URLSearchParams({
    method: "album.getInfo", artist: track.artist, album: track.album,
    api_key: key, format: "json",
  });
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) return null;
  const info = await response.json();
  const artwork = info.album?.image?.slice().reverse()
    .find(entry => imageAddress(entry["#text"]));
  return artwork ? download(artwork["#text"]) : null;
}

export async function coverImage(track, key) {
  if (!track) return null;
  const id = track.coverId;
  const cached = images.get(id);
  if (cached?.until > Date.now()) return cached.image;
  if (pending.has(id)) return pending.get(id);
  const request = findCover(track, key).catch(() => null).then(image => {
    if (images.size >= 60) images.delete(images.keys().next().value);
    images.set(id, { image, until: Date.now() + (image ? 86400000 : 120000) });
    return image;
  }).finally(() => pending.delete(id));
  pending.set(id, request);
  return request;
}
