const { NoSearchResultsError } = require("./errors");

// yt-search llama a un endpoint interno de YouTube (/youtubei/v1/next)
// usando un contexto/clave desactualizados, lo que provoca errores 400.
// En su lugar usamos "youtubei.js" (ya es dependencia del proyecto y es
// la misma librería que se usa para obtener info de los videos), que se
// mantiene actualizada contra los cambios del API interno de YouTube.

let youtubeiModule = null;
let innertubeInstance = null;

const getYoutubei = async () => {
  if (!youtubeiModule) {
    youtubeiModule = await import("youtubei.js");
    if (youtubeiModule.Platform && youtubeiModule.Platform.shim) {
      youtubeiModule.Platform.shim.eval = async data => {
        return new Function(data.output)();
      };
    }
  }
  return youtubeiModule;
};

const buildCookieHeader = () => {
  // Soporta dos formas de configurar la cookie en tu .env:
  //  1) YTDL_COOKIE="name1=value1; name2=value2; ..."  (header Cookie tal cual)
  //  2) YTDL_COOKIES='[{"name":"SID","value":"..."},...]'  (array JSON, el
  //     formato que exportan extensiones tipo "Cookie-Editor")
  if (process.env.YTDL_COOKIE) return process.env.YTDL_COOKIE;
  if (process.env.YOUTUBE_COOKIE) return process.env.YOUTUBE_COOKIE;

  const raw = process.env.YTDL_COOKIES || process.env.YOUTUBE_COOKIES;
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    return parsed
      .filter(c => c && c.name && c.value !== undefined)
      .map(c => `${c.name}=${c.value}`)
      .join("; ");
  } catch (err) {
    console.error("[ytdl-core-fer] No se pudo parsear YTDL_COOKIES como JSON:", err.message);
    return undefined;
  }
};

const createInnertube = async () => {
  const { Innertube } = await getYoutubei();
  // OJO: "generate_session_locally: true" genera una sesión falsa dentro del
  // propio proceso de Node. YouTube frecuentemente la rechaza con 400 en
  // /search (aunque /player funcione). Dejamos que la sesión se negocie
  // de verdad contra YouTube (comportamiento por defecto, sin ese flag).
  //
  // Si YouTube sigue devolviendo 400 en /search desde tu servidor, ya no es
  // un tema de código: está tratando las peticiones anónimas desde esa IP
  // (típico en VPS/hosting) como sospechosas. La solución es autenticar la
  // sesión con la cookie de una cuenta real de YouTube (ver YTDL_COOKIE(S)
  // arriba en buildCookieHeader).
  const cookie = buildCookieHeader();
  return Innertube.create({ retrieve_player: false, cookie });
};

const getInnertube = async () => {
  if (!innertubeInstance) {
    innertubeInstance = await createInnertube();
  }
  return innertubeInstance;
};

const toResult = video => ({
  videoId: video.video_id,
  title: video.title?.text ?? "",
  description: video.description_snippet?.text ?? "",
  url: `https://www.youtube.com/watch?v=${video.video_id}`,
  image: video.best_thumbnail?.url,
  thumbnail: video.best_thumbnail?.url,
  seconds: video.duration?.seconds ?? 0,
  timestamp: video.duration?.text ?? "",
  duration: {
    seconds: video.duration?.seconds ?? 0,
    timestamp: video.duration?.text ?? "",
  },
  views: video.view_count?.text ? Number(String(video.view_count.text).replace(/\D/g, "")) || 0 : 0,
  author: {
    name: video.author?.name ?? "",
    url: video.author?.url ?? video.author?.endpoint?.metadata?.url ?? "",
  },
  ago: video.published?.text ?? "",
});

/**
 * Busca videos en YouTube por texto.
 *
 * @param {string} query
 * @param {{ limit?: number }} [options]
 * @returns {Promise<Array>} lista de videos
 */
exports.search = async (query, options = {}) => {
  let yt = await getInnertube();
  let searchResults;
  try {
    searchResults = await yt.search(query, { type: "video" });
  } catch (err) {
    // Si falla (p.ej. sesión vieja o 400 puntual), forzamos una sesión
    // nueva y reintentamos una sola vez antes de tirar el error.
    console.error("[ytdl-core-fer] search() falló, reintentando con sesión nueva:", err?.info || err?.message || err);
    innertubeInstance = null;
    yt = await getInnertube();
    searchResults = await yt.search(query, { type: "video" });
  }

  const videos = (searchResults.results || [])
    .filter(node => node.type === "Video" && node.video_id)
    .map(toResult);

  return typeof options.limit === "number" ? videos.slice(0, options.limit) : videos;
};

/**
 * Busca en YouTube y devuelve el primer resultado.
 *
 * @param {string} query
 * @returns {Promise<Object>} el video encontrado
 * @throws {NoSearchResultsError} si no hay resultados
 */
exports.searchOne = async query => {
  const videos = await exports.search(query, { limit: 1 });
  if (!videos.length) {
    throw new NoSearchResultsError(`No se encontraron resultados para: ${query}`);
  }
  return videos[0];
};
