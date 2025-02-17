/* eslint-disable no-restricted-imports */
import fetchWithProxy from "fetch-with-proxy";
import nodeFetch, { RequestInit, Response } from "node-fetch";
import { useAgent } from "request-filtering-agent";
import env from "@server/env";
import Logger from "@server/logging/Logger";

export type { RequestInit } from "node-fetch";

/**
 * Fake Chrome user agent string for use in fetch requests to
 * improve reliability.
 */
export const chromeUserAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

/**
 * Wrapper around fetch that uses the request-filtering-agent in cloud hosted
 * environments to filter malicious requests, and the fetch-with-proxy library
 * in self-hosted environments to allow for request from behind a proxy.
 *
 * @param url The url to fetch
 * @param init The fetch init object
 * @returns The response
 */
export default async function fetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  // In self-hosted, webhooks support proxying and are also allowed to connect
  // to internal services, so use fetchWithProxy without the filtering agent.
  const fetchMethod = env.isCloudHosted ? nodeFetch : fetchWithProxy;

  Logger.silly("http", `Network request to ${url}`, init);

  const response = await fetchMethod(url, {
    ...init,
    agent: env.isCloudHosted ? useAgent(url) : undefined,
  });

  if (!response.ok) {
    Logger.silly("http", `Network request failed`, {
      url,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers.raw(),
    });
  }

  return response;
}
