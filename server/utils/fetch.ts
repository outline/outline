/* oxlint-disable no-restricted-imports, react/rules-of-hooks */
import type http from "node:http";
import type https from "node:https";
import nodeFetch, { type RequestInit, type Response } from "node-fetch";
import { getProxyForUrl } from "proxy-from-env";
import tunnelAgent, { type TunnelAgent } from "tunnel-agent";
import { useAgent as useFilteringAgent } from "request-filtering-agent";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { capitalize, defaults } from "lodash";
import { InternalError } from "@server/errors";

interface UrlWithTunnel extends URL {
  tunnelMethod?: string;
}

const DefaultOptions = {
  keepAlive: true,
  timeout: 1000,
  keepAliveMsecs: 500,
  maxSockets: 200,
  maxFreeSockets: 5,
  maxCachedSessions: 500,
};

export type { RequestInit } from "node-fetch";

/**
 * Default user agent string for outgoing requests.
 */
export const outlineUserAgent = `Outline-${
  env.VERSION ? `/${env.VERSION.slice(0, 7)}` : ""
}`;

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
  init?: RequestInit & {
    allowPrivateIPAddress?: boolean;
    timeout?: number;
  }
): Promise<Response> {
  Logger.silly("http", `Network request to ${url}`, init);

  const { allowPrivateIPAddress, timeout, ...rest } = init || {};

  // Create AbortController for timeout if specified
  let abortController: AbortController | undefined;
  let timeoutId: NodeJS.Timeout | undefined;

  if (timeout && !rest.signal) {
    abortController = new AbortController();
    timeoutId = setTimeout(() => {
      abortController?.abort();
    }, timeout);
  }

  try {
    const response = await nodeFetch(url, {
      ...rest,
      headers: {
        "User-Agent": outlineUserAgent,
        ...rest?.headers,
      },
      signal: abortController?.signal || rest.signal,
      agent: buildAgent(url, init),
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
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    if (!env.isCloudHosted && err.message?.startsWith("DNS lookup")) {
      throw InternalError(
        `${err.message}\n\nTo allow this request, add the IP address or CIDR range to the ALLOWED_PRIVATE_IP_ADDRESSES environment variable.`
      );
    }
    throw err;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Parses the proxy URL and returns an object with the properties
 *
 * @param url The URL to be fetched
 * @param proxyURL The proxy URL to be used
 * @returns An object containing the parsed proxy URL and tunnel method
 */
const parseProxy = (url: URL, proxyURL: string) => {
  const proxyObject = new URL(proxyURL) as UrlWithTunnel;
  const proxyProtocol = proxyObject.protocol?.replace(":", "");
  const proxyPort =
    proxyObject.port || (proxyProtocol === "https" ? "443" : "80");
  proxyObject.port = proxyPort;
  proxyObject.tunnelMethod = url.protocol
    ?.replace(":", "")
    .concat("Over")
    .concat(capitalize(proxyProtocol));
  return proxyObject;
};

/**
 * Builds a tunnel agent for the given proxy URL and options. Note that tunnel
 * agents do not perform request filtering.
 *
 * @param proxy The parsed proxy URL
 * @param options The request options
 * @returns A tunnel agent for the proxy
 */
const buildTunnel = (proxy: UrlWithTunnel, options: RequestInit) => {
  if (!proxy.tunnelMethod) {
    Logger.warn("Proxy tunnel method not defined");
    return;
  }
  if (!(proxy.tunnelMethod in tunnelAgent)) {
    Logger.warn(`Proxy tunnel method not supported: ${proxy.tunnelMethod}`);
    return;
  }

  const proxyAuth =
    proxy.username || proxy.password
      ? `${proxy.username}:${proxy.password}`
      : undefined;

  return tunnelAgent[proxy.tunnelMethod as keyof TunnelAgent]({
    ...options,
    proxy: {
      port: proxy.port,
      host: proxy.hostname,
      proxyAuth,
    },
  });
};

/**
 * Creates a http or https agent for the given URL, applying request filtering
 * if necessary. If a proxy is detected in the environment, it will use that
 * proxy agent to tunnel the request.
 *
 * @param url The URL to fetch
 * @param options The fetch options
 * @returns An http or https agent configured for the URL
 */
function buildAgent(
  url: string,
  options: RequestInit & {
    allowPrivateIPAddress?: boolean;
  } = {}
) {
  const agentOptions = defaults(options, DefaultOptions);
  const parsedURL = new URL(url);
  const proxyURL = getProxyForUrl(parsedURL.href);
  let agent: https.Agent | http.Agent | undefined;

  // Add allowIPAddressList from environment configuration
  const filteringOptions = {
    ...agentOptions,
    allowIPAddressList: env.ALLOWED_PRIVATE_IP_ADDRESSES,
  };

  if (proxyURL) {
    const parsedProxyURL = parseProxy(parsedURL, proxyURL);

    Logger.silly("http", `Using proxy for request`, {
      url: parsedURL.toString(),
      proxy: parsedProxyURL.href,
      tunnelMethod: parsedProxyURL.tunnelMethod,
      username: parsedProxyURL.username || undefined,
      password: parsedProxyURL.password ? "******" : undefined,
    });

    if (parsedProxyURL.tunnelMethod?.startsWith("httpOver")) {
      const proxyURL = new URL(parsedProxyURL.href);
      proxyURL.pathname = (parsedURL.protocol ?? "")
        .concat("//")
        .concat(parsedURL.host ?? "")
        .concat(parsedURL.pathname + parsedURL.search);
      if (parsedProxyURL.username || parsedProxyURL.password) {
        proxyURL.username = parsedProxyURL.username;
        proxyURL.password = parsedProxyURL.password;
      }
      agent = useFilteringAgent(proxyURL.toString(), filteringOptions);
    } else {
      // Note request filtering agent does not support https tunneling via a proxy
      agent =
        buildTunnel(parsedProxyURL, agentOptions) ||
        useFilteringAgent(parsedURL.toString(), filteringOptions);
    }
  } else {
    agent = useFilteringAgent(parsedURL.toString(), filteringOptions);
  }

  if (options.signal) {
    options.signal.addEventListener("abort", () => {
      if (agent && "destroy" in agent) {
        agent.destroy();
      }
    });
  }

  return agent;
}
