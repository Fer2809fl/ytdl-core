import ytdl from "../lib/index.js";

export default ytdl;

export const getBasicInfo = ytdl.getBasicInfo;
export const getInfo = ytdl.getInfo;
export const chooseFormat = ytdl.chooseFormat;
export const filterFormats = ytdl.filterFormats;
export const validateID = ytdl.validateID;
export const validateURL = ytdl.validateURL;
export const getURLVideoID = ytdl.getURLVideoID;
export const getVideoID = ytdl.getVideoID;
export const createAgent = ytdl.createAgent;
export const createProxyAgent = ytdl.createProxyAgent;
export const downloadFromInfo = ytdl.downloadFromInfo;
export const downloadFromQuery = ytdl.downloadFromQuery;
export const search = ytdl.search;
export const searchOne = ytdl.searchOne;
export const cache = ytdl.cache;
export const errors = ytdl.errors;
export const version = ytdl.version;
