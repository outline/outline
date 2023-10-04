/* eslint-disable no-restricted-imports */
import fetchWithProxy from "fetch-with-proxy";
import nodeFetch, { RequestInit, Response } from "node-fetch";
import { useAgent } from "request-filtering-agent";
import env from "@server/env";

/**
 * Wrapper around fetch that uses the request-filtering-agent in cloud hosted
 * environments to filter malicious requests, and the fetch-with-proxy library
 * in self-hosted environments to allow for request from behind a proxy.
 *
 * @param url The url to fetch
 * @param init The fetch init object
 * @returns The response
 */
export default function fetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  // In self-hosted, webhooks support proxying and are also allowed to connect
  // to internal services, so use fetchWithProxy without the filtering agent.
  const fetch = env.isCloudHosted ? nodeFetch : fetchWithProxy;

  return fetch(url, {
    ...init,
    agent: env.isCloudHosted ? useAgent(url) : undefined,
  });
}
