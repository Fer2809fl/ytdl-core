const PassThrough = require("stream").PassThrough;
const { Readable } = require("stream");
const urlUtils = require("./url-utils");
const agent = require("./agent");
const errors = require("./errors");
const search = require("./search");

let youtubeiModule = null;
let innertubeInstance = null;

async function getYoutubei() {
  if (!youtubeiModule) {
    youtubeiModule = await import("youtubei.js");
    if (youtubeiModule.Platform && youtubeiModule.Platform.shim) {
      youtubeiModule.Platform.shim.eval = async (data) => {
        return new Function(data.output)();
      };
    }
  }
  return youtubeiModule;
}

async function getInnertube(options = {}) {
  const { Innertube } = await getYoutubei();
  const cookieStr = options.agent?.jar
    ? options.agent.jar.getCookieStringSync("https://www.youtube.com")
    : undefined;

  const cacheKey = `${cookieStr || ""}|${options.poToken || ""}|${options.visitorData || ""}`;
  if (!innertubeInstance || innertubeInstance._cacheKey !== cacheKey) {
    innertubeInstance = await Innertube.create({
      cookie: cookieStr,
      po_token: options.poToken,
      visitor_data: options.visitorData,
      generate_session_locally: true,
    });
    innertubeInstance._cacheKey = cacheKey;
  }
  return innertubeInstance;
}

function adaptFormat(fmt) {
  if (!fmt) return null;
  const mimeType = fmt.mime_type || "";
  const codecsMatch = mimeType.match(/codecs="([^"]+)"/);
  const codecs = codecsMatch ? codecsMatch[1] : null;
  const codecParts = codecs ? codecs.split(",").map((c) => c.trim()) : [];
  const videoCodec = codecParts[0] || null;
  const audioCodec = codecParts.length > 1 ? codecParts[codecParts.length - 1] : null;

  return {
    itag: fmt.itag,
    url: fmt.url,
    mimeType: mimeType,
    qualityLabel: fmt.quality_label,
    bitrate: fmt.bitrate,
    audioBitrate: fmt.audio_sample_rate ? Math.round(fmt.audio_sample_rate / 1000) : undefined,
    width: fmt.width,
    height: fmt.height,
    contentLength: fmt.content_length,
    fps: fmt.fps,
    hasVideo: !!fmt.has_video,
    hasAudio: !!fmt.has_audio,
    container: mimeType.split("/")[1]?.split(";")[0]?.trim() || null,
    codecs: codecs,
    videoCodec: videoCodec,
    audioCodec: audioCodec,
    isLive: false,
    isHLS: mimeType.includes("mpegurl") || mimeType.includes("hls"),
    isDashMPD: false,
    _ytjsFormat: fmt,
  };
}

function adaptInfo(info) {
  const formats = [];
  if (info.streaming_data) {
    for (const fmt of [
      ...(info.streaming_data.formats || []),
      ...(info.streaming_data.adaptive_formats || []),
    ]) {
      if (fmt) formats.push(adaptFormat(fmt));
    }
  }

  const bestFormat =
    formats.find((f) => f.hasVideo && f.hasAudio) ||
    formats.find((f) => f.hasVideo) ||
    formats.find((f) => f.hasAudio) ||
    formats[0];

  const details = info.basic_info || {};

  return {
    videoDetails: {
      videoId: details.id,
      title: details.title,
      lengthSeconds: details.duration?.toString(),
      thumbnails: details.thumbnail || [],
      description: details.short_description || "",
      author: {
        id: details.channel_id,
        name: details.author,
        user: details.channel_id,
        channel_url: details.channel_id
          ? `https://www.youtube.com/channel/${details.channel_id}`
          : "",
        thumbnails: [],
      },
      viewCount: details.view_count?.toString(),
      likes: details.like_count,
      category: details.category,
      publishDate: details.upload_date,
      keywords: details.keywords,
      isLiveContent: details.is_live,
      isPrivate: details.is_private,
    },
    formats,
    bestFormat,
    videoUrl: bestFormat?.url,
    selectedFormat: bestFormat,
    full: true,
    player_response: {},
    html5player: null,
    related_videos: [],
    _ytjsInfo: info,
  };
}

const ytdl = (link, options) => {
  const stream = new PassThrough({ highWaterMark: options?.highWaterMark || 1024 * 512 });

  ytdl
    .getInfo(link, options)
    .then((info) => {
      try {
        const format = ytdl.chooseFormat(info.formats, options);
        stream.emit("info", info, format);
        ytdl.downloadFromInfo(info, options).pipe(stream);
      } catch (err) {
        stream.emit("error", err);
      }
    })
    .catch((err) => stream.emit("error", err));

  return stream;
};

module.exports = ytdl;

ytdl.getBasicInfo = async (link, options) => {
  return ytdl.getInfo(link, options);
};

ytdl.getInfo = async (link, options = {}) => {
  const id = await urlUtils.getVideoID(link);
  const youtube = await getInnertube(options);
  const info = await youtube.getInfo(id);
  return adaptInfo(info);
};

ytdl.chooseFormat = (formats, options) => {
  if (!formats || !formats.length) {
    throw new errors.NoFormatsError("No formats available");
  }

  if (typeof options.format === "object") {
    const found = formats.find((f) => f.itag === options.format.itag);
    if (!found) throw new errors.NoFormatsError("Specified format not found");
    return found;
  }

  let filtered = [...formats];

  if (options.filter) {
    filtered = ytdl.filterFormats(filtered, options.filter);
  }

  if (options.quality === "highest" || !options.quality) {
    return filtered[0];
  }
  if (options.quality === "lowest") {
    return filtered[filtered.length - 1];
  }
  if (options.quality === "highestaudio") {
    filtered = filtered.filter((f) => f.hasAudio);
    return filtered[0];
  }
  if (options.quality === "lowestaudio") {
    filtered = filtered.filter((f) => f.hasAudio);
    return filtered[filtered.length - 1];
  }
  if (options.quality === "highestvideo") {
    filtered = filtered.filter((f) => f.hasVideo);
    return filtered[0];
  }
  if (options.quality === "lowestvideo") {
    filtered = filtered.filter((f) => f.hasVideo);
    return filtered[filtered.length - 1];
  }

  const found = filtered.find((f) => `${f.itag}` === `${options.quality}`);
  if (!found) throw new errors.NoFormatsError(`No such format found: ${options.quality}`);
  return found;
};

ytdl.filterFormats = (formats, filter) => {
  if (!Array.isArray(formats)) return [];
  let fn;
  switch (filter) {
    case "videoandaudio":
    case "audioandvideo":
      fn = (f) => f.hasVideo && f.hasAudio;
      break;
    case "video":
      fn = (f) => f.hasVideo;
      break;
    case "videoonly":
      fn = (f) => f.hasVideo && !f.hasAudio;
      break;
    case "audio":
      fn = (f) => f.hasAudio;
      break;
    case "audioonly":
      fn = (f) => !f.hasVideo && f.hasAudio;
      break;
    default:
      if (typeof filter === "function") fn = filter;
      else throw new TypeError(`Given filter (${filter}) is not supported`);
  }
  return formats.filter((f) => !!f.url && fn(f));
};

ytdl.validateID = urlUtils.validateID;
ytdl.validateURL = urlUtils.validateURL;
ytdl.getURLVideoID = urlUtils.getURLVideoID;
ytdl.getVideoID = urlUtils.getVideoID;
ytdl.createAgent = agent.createAgent;
ytdl.createProxyAgent = agent.createProxyAgent;
ytdl.cache = {
  info: { getOrSet: (k, fn) => fn() },
  watch: { getOrSet: (k, fn) => fn() },
};
ytdl.errors = errors;
ytdl.search = search.search;
ytdl.searchOne = search.searchOne;
ytdl.version = require("../package.json").version;

ytdl.downloadFromInfo = (info, options = {}) => {
  const stream = new PassThrough({ highWaterMark: options?.highWaterMark || 1024 * 512 });

  if (!info._ytjsInfo) {
    setImmediate(() =>
      stream.emit(
        "error",
        new errors.YtdlError("Cannot use `ytdl.downloadFromInfo()` with incompatible info object")
      )
    );
    return stream;
  }

  (async () => {
    try {
      let ytjsFormat;

      if (options.format && options.format._ytjsFormat) {
        ytjsFormat = options.format._ytjsFormat;
      } else {
        const type =
          options.filter === "audioonly"
            ? "audio"
            : options.filter === "videoonly"
              ? "video"
              : "video+audio";
        const quality =
          options.quality === "highest"
            ? "best"
            : options.quality === "lowest"
              ? "worst"
              : options.quality || "best";
        ytjsFormat = info._ytjsInfo.chooseFormat({ quality, type });
      }

      if (!ytjsFormat) {
        throw new errors.NoFormatsError("No suitable format found");
      }

      const webStream = await ytjsFormat.download();
      const nodeStream = Readable.fromWeb(webStream);

      let downloaded = 0;
      nodeStream.on("data", (chunk) => {
        downloaded += chunk.length;
        stream.emit("progress", chunk.length, downloaded, 0);
      });

      nodeStream.on("error", (err) => stream.emit("error", err));
      nodeStream.pipe(stream);
    } catch (err) {
      stream.emit("error", err);
    }
  })();

  return stream;
};

ytdl.downloadFromQuery = (query, options) => {
  const stream = new PassThrough({ highWaterMark: options?.highWaterMark || 1024 * 512 });

  search
    .searchOne(query)
    .then((video) => {
      stream.emit("searchResult", video);
      ytdl
        .getInfo(video.url, options)
        .then((info) => ytdl.downloadFromInfo(info, options).pipe(stream), (err) =>
          stream.emit("error", err)
        );
    }, (err) => stream.emit("error", err));

  return stream;
};
