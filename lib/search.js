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

const createInnertube = async () => {
  const { Innertube } = await getYoutubei();
  // OJO: "generate_session_locally: true" genera una sesión falsa dentro del
  // propio proceso de Node. YouTube frecuentemente la rechaza con 400 en
  // /search (aunque /player funcione). Dejamos que la sesión se negocie
  // de verdad contra YouTube (comportamiento por defecto, sin ese flag).
  return Innertube.create({ retrieve_player: false });
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
