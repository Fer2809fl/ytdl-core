const { CookieJar } = require("tough-cookie");

const createAgent = (exports.createAgent = (cookies = [], opts = {}) => {
  const jar = new CookieJar();
  if (cookies && Array.isArray(cookies)) {
    for (const c of cookies) {
      const domain = c.domain || ".youtube.com";
      try {
        const cookieStr = [
          `${c.name}=${c.value}`,
          `Domain=${domain}`,
          `Path=${c.path || "/"}`,
          c.secure !== false ? "Secure" : "",
          c.httpOnly ? "HttpOnly" : "",
          c.sameSite ? `SameSite=${c.sameSite}` : "",
        ]
          .filter(Boolean)
          .join("; ");
        jar.setCookieSync(cookieStr, `https://${domain.replace(/^\./, "")}`);
      } catch (e) {
        jar.setCookieSync(`${c.name}=${c.value}`, "https://www.youtube.com");
      }
    }
  }
  return { jar, localAddress: opts.localAddress };
});

exports.createProxyAgent = (options, cookies = []) => {
  if (typeof options === "string") options = { uri: options };
  const ag = createAgent(cookies, options);
  ag.proxyUri = options.uri;
  return ag;
};

exports.defaultAgent = createAgent();
