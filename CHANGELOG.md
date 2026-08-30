# Changelog

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
