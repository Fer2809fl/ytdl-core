const yts = require("yt-search");
const { NoSearchResultsError } = require("./errors");

/**
 * Busca videos en YouTube por texto.
 *
 * @param {string} query
 * @param {{ limit?: number }} [options]
 * @returns {Promise<Array>} lista de videos (yt-search video objects)
 */
exports.search = async (query, options = {}) => {
  const results = await yts(query);
  const videos = results.videos || [];
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
