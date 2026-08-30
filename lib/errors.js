class YtdlError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class UnrecoverableError extends YtdlError {}

class UnavailableError extends UnrecoverableError {}

class LiveStreamOfflineError extends UnrecoverableError {}

class LoginRequiredError extends UnrecoverableError {}

class NoFormatsError extends YtdlError {}

class InvalidURLError extends YtdlError {
  constructor(message) {
    super(message);
    this.name = "InvalidURLError";
  }
}

class ParsingError extends YtdlError {}

class StatusCodeError extends YtdlError {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = {
  YtdlError,
  UnrecoverableError,
  UnavailableError,
  LiveStreamOfflineError,
  LoginRequiredError,
  NoFormatsError,
  InvalidURLError,
  ParsingError,
  StatusCodeError,
};
