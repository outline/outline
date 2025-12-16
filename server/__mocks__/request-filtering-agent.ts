import http from "http";
import https from "https";

/**
 * Mock implementation of request-filtering-agent for testing.
 * This mock returns standard http/https agents without filtering.
 */
export class RequestFilteringHttpAgent extends http.Agent {}

export class RequestFilteringHttpsAgent extends https.Agent {}

export const globalHttpAgent = new RequestFilteringHttpAgent();
export const globalHttpsAgent = new RequestFilteringHttpsAgent();

export const useAgent = (url: string, options?: any) => {
  const parsedUrl = new URL(url);
  return parsedUrl.protocol === "https:"
    ? new RequestFilteringHttpsAgent(options)
    : new RequestFilteringHttpAgent(options);
};
