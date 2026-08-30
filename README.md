# @fer2809fl/ytdl-core

Fork personal de [`@distube/ytdl-core`](https://github.com/distubejs/ytdl-core) (a su vez fork del
[`ytdl-core`](https://github.com/fent/node-ytdl-core) original de fent). Descargador de video de YouTube
en JavaScript puro, sin dependencias externas de binarios.

Este fork parte de la base oficial de DisTube y le agrega:

- **Jerarquía de errores propia** (`ytdl.errors`) en vez de `Error` genéricos, para poder distinguir
  el tipo de falla con `instanceof` sin parsear mensajes.
- **Soporte dual CJS/ESM**, exportado vía el campo `exports` de `package.json`.
- Referencias de mantenimiento (issues, chequeo de versión) apuntando a este repo.

## Instalación

```bash
npm install @fer2809fl/ytdl-core
```

## Uso básico

CommonJS:

```js
const ytdl = require("@fer2809fl/ytdl-core");
const fs = require("fs");

ytdl("https://www.youtube.com/watch?v=VIDEO_ID").pipe(fs.createWriteStream("video.mp4"));
```

ESM:

```js
import ytdl from "@fer2809fl/ytdl-core";
import fs from "fs";

ytdl("https://www.youtube.com/watch?v=VIDEO_ID").pipe(fs.createWriteStream("video.mp4"));
```

## Búsqueda + descarga en un solo paso

Este fork suma búsqueda por texto (vía [`yt-search`](https://github.com/talmobi/yt-search), sin API key)
combinada con la descarga, para no tener que encadenar dos librerías vos mismo:

```js
const ytdl = require("@fer2809fl/ytdl-core");
const fs = require("fs");

// Solo buscar, devuelve la lista de resultados
const videos = await ytdl.search("rick astley never gonna give you up");

// Buscar y quedarte con el primer resultado
const video = await ytdl.searchOne("rick astley never gonna give you up");
console.log(video.title, video.url);

// Buscar por texto Y descargar el primer resultado, todo junto
ytdl
  .downloadFromQuery("rick astley never gonna give you up")
  .on("searchResult", video => console.log("Descargando:", video.title))
  .pipe(fs.createWriteStream("video.mp4"));
```

`ytdl.downloadFromQuery()` devuelve un stream igual que `ytdl(url)`, con los mismos eventos
(`info`, `progress`, `error`, etc.) más el evento extra `searchResult`, que se emite apenas
se encuentra el video antes de arrancar la descarga. Si la búsqueda no encuentra nada, el stream
emite un error `ytdl.errors.NoSearchResultsError`.

## Manejo de errores

Todas las fallas conocidas heredan de `ytdl.errors.YtdlError`, así que se pueden distinguir por tipo:

```js
const ytdl = require("@fer2809fl/ytdl-core");

try {
  const info = await ytdl.getInfo(url);
} catch (err) {
  if (err instanceof ytdl.errors.UnavailableError) {
    // video privado, eliminado o con restricción de login
  } else if (err instanceof ytdl.errors.LiveStreamOfflineError) {
    // el stream en vivo no está transmitiendo
  } else if (err instanceof ytdl.errors.NoFormatsError) {
    // no se encontraron formatos descargables
  } else if (err instanceof ytdl.errors.InvalidURLError) {
    // la URL o el video ID no son válidos
  } else if (err instanceof ytdl.errors.StatusCodeError) {
    // fallo de red/HTTP, err.statusCode tiene el código
  } else if (err instanceof ytdl.errors.ParsingError) {
    // YouTube cambió su estructura de respuesta
  } else if (err instanceof ytdl.errors.NoSearchResultsError) {
    // la búsqueda por texto no encontró videos
  }
}
```

Clases disponibles: `YtdlError`, `UnrecoverableError`, `UnavailableError`, `LiveStreamOfflineError`,
`LoginRequiredError`, `NoFormatsError`, `NoSearchResultsError`, `InvalidURLError`, `ParsingError`,
`StatusCodeError`.

## API

La API es la misma que `@distube/ytdl-core` (`ytdl()`, `ytdl.getInfo()`, `ytdl.getBasicInfo()`,
`ytdl.chooseFormat()`, `ytdl.filterFormats()`, `ytdl.validateURL()`, `ytdl.validateID()`,
`ytdl.getURLVideoID()`, `ytdl.getVideoID()`, `ytdl.downloadFromInfo()`, `ytdl.createAgent()`,
`ytdl.createProxyAgent()`, `ytdl.cache`), más lo agregado en este fork (`ytdl.errors`, `ytdl.search()`,
`ytdl.searchOne()`, `ytdl.downloadFromQuery()`), así que cualquier código escrito para
`@distube/ytdl-core` funciona igual acá, solo cambiando el nombre del paquete en el `require`/`import`.

Documentación completa de opciones (agentes, proxies, cookies, IP rotation, cache, filtros de
formato, etc.): ver el [README de DisTube](https://github.com/distubejs/ytdl-core#readme), que sigue
aplicando 1:1 salvo por lo listado arriba.

## Créditos

Basado en el trabajo de [fent](https://github.com/fent) y de los mantenedores de
[DisTube](https://github.com/distubejs/ytdl-core). Mantenido acá por
[Fer2809fl](https://github.com/Fer2809fl).

## Licencia

MIT
