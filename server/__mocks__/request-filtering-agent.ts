import http from "node:http";
import https from "node:https";

interface MockAgentOptions
  extends http.AgentOptions, Pick<https.AgentOptions, "maxCachedSessions"> {}

export function useAgent(url: string, options: MockAgentOptions = {}) {
  const parsedUrl = new URL(url);
  const agentOptions = {
    keepAlive: options.keepAlive,
    timeout: options.timeout,
    keepAliveMsecs: options.keepAliveMsecs,
    maxSockets: options.maxSockets,
    maxFreeSockets: options.maxFreeSockets,
  };

  if (parsedUrl.protocol === "https:") {
    return new https.Agent({
      ...agentOptions,
      maxCachedSessions: options.maxCachedSessions,
    });
  }

  return new http.Agent(agentOptions);
}
