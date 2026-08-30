# Changelog

## 1.1.0

- Búsqueda de YouTube por texto vía [`yt-search`](https://github.com/talmobi/yt-search) (sin API key),
  expuesta como `ytdl.search()` y `ytdl.searchOne()`.
- `ytdl.downloadFromQuery(query, options)`: combina búsqueda + `getInfo` + descarga en un solo stream,
  con el mismo comportamiento que `ytdl(url)` pero a partir de texto en vez de una URL. Emite el evento
  extra `searchResult` con el video encontrado antes de empezar a descargar.
- Nueva clase de error `NoSearchResultsError` para cuando la búsqueda no encuentra nada.

## 1.0.0

- Fork inicial a partir de `@distube/ytdl-core` v4.16.12.
- Nueva jerarquía de errores propia expuesta en `ytdl.errors` (`YtdlError`, `UnrecoverableError`,
  `UnavailableError`, `LiveStreamOfflineError`, `LoginRequiredError`, `NoFormatsError`,
  `InvalidURLError`, `ParsingError`, `StatusCodeError`), reemplazando los `Error`/`TypeError`
  genéricos que lanzaba la librería original.
- Soporte dual CommonJS/ESM vía el campo `exports` de `package.json` (`esm/index.mjs` como entrada
  ESM, `lib/index.js` sin cambios como entrada CJS).
- Rebrandeo de mantenimiento: nombre de paquete, enlaces de reporte de issues y aviso de
  actualización apuntando a este repositorio.
