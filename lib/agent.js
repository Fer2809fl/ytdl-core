const { ProxyAgent } = require("undici");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { Cookie, CookieJar, canonicalDomain } = require("tough-cookie");
const { CookieAgent, cookie } = require("http-cookie-agent/undici");

const convertSameSite = sameSite => {
  switch (sameSite) {
    case "strict":
      return "strict";
    case "lax":
      return "lax";
    case "no_restriction":
    case "unspecified":
    default:
      return "none";
  }
};

const convertCookie = cookie =>
  cookie instanceof Cookie
    ? cookie
    : new Cookie({
        key: cookie.name,
        value: cookie.value,
        expires: typeof cookie.expirationDate === "number" ? new Date(cookie.expirationDate * 1000) : "Infinity",
        domain: canonicalDomain(cookie.domain),
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: convertSameSite(cookie.sameSite),
        hostOnly: cookie.hostOnly,
      });

const addCookies = (exports.addCookies = (jar, cookies) => {
  if (!cookies || !Array.isArray(cookies)) {
    throw new Error("cookies must be an array");
  }

  // SOCS actualizado para 2025-2026
  if (!cookies.some(c => c.name === "SOCS")) {
    cookies.push({
      domain: ".youtube.com",
      hostOnly: false,
      httpOnly: false,
      name: "SOCS",
      path: "/",
      sameSite: "lax",
      secure: true,
      session: false,
      value: "CAESEwgDEgk0NzQ2ODI0NjAaAmVzIAEaBgiA6K6wBg",
    });
  }

  // CONSENT para evitar banner de cookies que dispara deteccion de bot
  if (!cookies.some(c => c.name === "CONSENT")) {
    cookies.push({
      domain: ".youtube.com",
      hostOnly: false,
      httpOnly: false,
      name: "CONSENT",
      path: "/",
      sameSite: "no_restriction",
      secure: true,
      session: false,
      value: "PENDING+987",
    });
  }

  // Cookies esenciales que YouTube espera siempre
  const essentialCookies = [
    { name: "VISITOR_INFO1_LIVE", value: "placeholder" },
    { name: "YSC", value: "placeholder" },
    { name: "GPS", value: "1" },
  ];
  for (const ec of essentialCookies) {
    if (!cookies.some(c => c.name === ec.name)) {
      cookies.push({
        domain: ".youtube.com",
        hostOnly: false,
        httpOnly: ec.name !== "GPS",
        name: ec.name,
        path: "/",
        sameSite: "lax",
        secure: true,
        session: true,
        value: ec.value,
      });
    }
  }

  for (const cookie of cookies) {
    jar.setCookieSync(convertCookie(cookie), "https://www.youtube.com");
  }
});

exports.addCookiesFromString = (jar, cookies) => {
  if (!cookies || typeof cookies !== "string") {
    throw new Error("cookies must be a string");
  }
  return addCookies(
    jar,
    cookies
      .split(";")
      .map(c => Cookie.parse(c))
      .filter(Boolean),
  );
};

const createAgent = (exports.createAgent = (cookies = [], opts = {}) => {
  const options = Object.assign({}, opts);
  if (!options.cookies) {
    const jar = new CookieJar();
    addCookies(jar, cookies);
    options.cookies = { jar };
  }
  return {
    dispatcher: new CookieAgent(options),
    localAddress: options.localAddress,
    jar: options.cookies.jar,
  };
});

exports.createProxyAgent = (options, cookies = []) => {
  if (!cookies) cookies = [];
  if (typeof options === "string") options = { uri: options };
  const jar = new CookieJar();
  addCookies(jar, cookies);

  // ProxyAgent type that node httplibrary supports
  const agent = new HttpsProxyAgent(options.uri);

  // ProxyAgent type that undici supports
  const dispatcher = new ProxyAgent(options).compose(cookie({ jar }));

  return { dispatcher, agent, jar, localAddress: options.localAddress };
};

exports.defaultAgent = createAgent();
