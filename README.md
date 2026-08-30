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
  }
}
```

Clases disponibles: `YtdlError`, `UnrecoverableError`, `UnavailableError`, `LiveStreamOfflineError`,
`LoginRequiredError`, `NoFormatsError`, `InvalidURLError`, `ParsingError`, `StatusCodeError`.

## API

La API es la misma que `@distube/ytdl-core` (`ytdl()`, `ytdl.getInfo()`, `ytdl.getBasicInfo()`,
`ytdl.chooseFormat()`, `ytdl.filterFormats()`, `ytdl.validateURL()`, `ytdl.validateID()`,
`ytdl.getURLVideoID()`, `ytdl.getVideoID()`, `ytdl.downloadFromInfo()`, `ytdl.createAgent()`,
`ytdl.createProxyAgent()`, `ytdl.cache`), así que cualquier código escrito para `@distube/ytdl-core`
funciona igual acá, solo cambiando el nombre del paquete en el `require`/`import`.

Documentación completa de opciones (agentes, proxies, cookies, IP rotation, cache, filtros de
formato, etc.): ver el [README de DisTube](https://github.com/distubejs/ytdl-core#readme), que sigue
aplicando 1:1 salvo por lo listado arriba.

## Créditos

Basado en el trabajo de [fent](https://github.com/fent) y de los mantenedores de
[DisTube](https://github.com/distubejs/ytdl-core). Mantenido acá por
[Fer2809fl](https://github.com/Fer2809fl).

## Licencia

MIT
