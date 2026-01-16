const http = require("http");
const https = require("https");

/**
 * Mock implementation of request-filtering-agent for Jest testing
 * This avoids ESM module issues in the test environment
 */
function useAgent(url, options = {}) {
  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === "https:";

  // Validate that the URL protocol is supported
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new TypeError(
      `Protocol "${parsedUrl.protocol}" not supported. Expected "http:" or "https:"`
    );
  }

  // Create a basic agent based on the protocol
  const Agent = isHttps ? https.Agent : http.Agent;

  // Return a new agent with the provided options
  return new Agent({
    keepAlive: options.keepAlive,
    timeout: options.timeout,
    keepAliveMsecs: options.keepAliveMsecs,
    maxSockets: options.maxSockets,
    maxFreeSockets: options.maxFreeSockets,
    maxCachedSessions: options.maxCachedSessions,
  });
}

module.exports = {
  useAgent,
};
