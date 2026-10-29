/* oxlint-disable no-restricted-imports, react/rules-of-hooks */
import { promises as dns } from "node:dns";
import type http from "node:http";
import type https from "node:https";
import * as net from "node:net";
import nodeFetch, {
  Headers,
  type RequestInit,
  type Response,
} from "node-fetch";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { getProxyForUrl } from "proxy-from-env";
import { errToString } from "@shared/utils/error";
import env from "@server/env";
import { InvalidRequestError } from "@server/errors";
import Logger from "@server/logging/Logger";
import {
  type RequestFilteringAgentOptions,
  useAgent as useFilteringAgent,
  validateIPAddress,
} from "./requestFilteringAgent";

const DefaultOptions = {
  keepAlive: true,
  timeout: 1000,
  keepAliveMsecs: 500,
  maxSockets: 200,
  maxFreeSockets: 5,
  maxCachedSessions: 500,
};

export type { RequestInit, Response } from "node-fetch";
export { Headers };

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
 * Resolves the hostname and validates every returned address against the
 * filtering rules.
 *
 * @param req The request that will connect to the host.
 * @param host The target hostname or IP address.
 * @param options Allow/deny rules to apply.
 * @throws An error if any resolved address is disallowed, or if the request
 * was aborted during the lookup.
 */
const validateTarget = async (
  req: http.ClientRequest,
  host: string,
  options: RequestFilteringAgentOptions
): Promise<void> => {
  const addresses =
    net.isIP(host) !== 0
      ? [{ address: host, family: net.isIP(host) }]
      : await dns.lookup(host, { all: true });

  for (const { address, family } of addresses) {
    const err = validateIPAddress({ address, family, host }, options);
    if (err) {
      throw err;
    }
  }

  if (req.destroyed) {
    throw new Error("Request aborted");
  }
};

/**
 * Proxy agents connect to the proxy rather than the target, so they skip the
 * filtering agent's DNS hook. These validate the target of every request,
 * including redirects, before connecting. The proxy resolves DNS again, so
 * only egress rules on the proxy can fully prevent DNS rebinding.
 */
class FilteringHttpProxyAgent extends HttpProxyAgent<string> {
  constructor(
    proxy: string,
    private filtering: RequestFilteringAgentOptions
  ) {
    super(proxy, DefaultOptions);
  }

  setRequestProps(
    ...args: Parameters<HttpProxyAgent<string>["setRequestProps"]>
  ) {
    const [req, opts] = args;
    const path = req.path;
    super.setRequestProps(...args);

    // The parent resolves the path against the Host header, so a path such
    // as "//other.host/" or a custom Host header would change the target.
    if (path.startsWith("/")) {
      const host = net.isIPv6(opts.host ?? "") ? `[${opts.host}]` : opts.host;
      const protocol = opts.secureEndpoint ? "https:" : "http:";
      const defaultPort = opts.secureEndpoint ? 443 : 80;
      const port =
        opts.port && opts.port !== defaultPort ? `:${opts.port}` : "";
      req.path = `${protocol}//${host}${port}${path}`;
    }
  }

  async connect(...args: Parameters<HttpProxyAgent<string>["connect"]>) {
    await validateTarget(args[0], args[1].host ?? "", this.filtering);
    return super.connect(...args);
  }
}

class FilteringHttpsProxyAgent extends HttpsProxyAgent<string> {
  constructor(
    proxy: string,
    private filtering: RequestFilteringAgentOptions
  ) {
    super(proxy, DefaultOptions);
  }

  async connect(...args: Parameters<HttpsProxyAgent<string>["connect"]>) {
    await validateTarget(args[0], args[1].host ?? "", this.filtering);
    return super.connect(...args);
  }
}

/**
 * Wrapper around fetch that filters requests to private IP addresses, and sends
 * requests through a proxy when one is configured in the environment.
 *
 * @param url The url to fetch
 * @param init The fetch init object
 * @param init.allowIPAddressList Private IP addresses or CIDR ranges that may
 *   be requested. Defaults to the ALLOWED_PRIVATE_IP_ADDRESSES environment
 *   variable; pass an empty list to block every private address.
 * @param init.timeout Time limit in milliseconds.
 * @returns The response
 */
export default async function fetch(
  url: string,
  init?: RequestInit & {
    allowPrivateIPAddress?: boolean;
    allowIPAddressList?: string[];
    timeout?: number;
  }
): Promise<Response> {
  Logger.silly("http", `Network request to ${url}`, init);

  const {
    allowPrivateIPAddress,
    allowIPAddressList = env.ALLOWED_PRIVATE_IP_ADDRESSES ?? [],
    timeout,
    ...rest
  } = init || {};

  // The timeout signal stays active after fetch returns so it also limits
  // reading the body.
  const timeoutSignal = timeout ? AbortSignal.timeout(timeout) : undefined;
  const signal =
    rest.signal && timeoutSignal
      ? AbortSignal.any([rest.signal, timeoutSignal])
      : (rest.signal ?? timeoutSignal);

  try {
    const headers = new Headers({ "User-Agent": outlineUserAgent });
    new Headers(rest?.headers).forEach((value, key) => {
      headers.set(key, value);
    });

    const response = await nodeFetch(url, {
      ...rest,
      headers,
      signal,
      // A function so that redirects get an agent for their own protocol.
      agent: (requestURL) =>
        buildAgent(requestURL.href, {
          signal,
          allowPrivateIPAddress,
          allowIPAddressList,
        }),
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
    if (
      timeoutSignal?.aborted &&
      err instanceof Error &&
      err.name === "AbortError"
    ) {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    const message = errToString(err);
    if (message.includes("DNS lookup")) {
      throw InvalidRequestError(
        env.isCloudHosted
          ? message
          : `${message}\n\nTo allow this request, add the IP address or CIDR range to the ALLOWED_PRIVATE_IP_ADDRESSES environment variable.`
      );
    }
    throw err;
  }
}

/**
 * Creates a http or https agent for the given URL, applying request filtering
 * if necessary. If a proxy is detected in the environment, the request is sent
 * through that proxy instead.
 *
 * @param url The URL to fetch.
 * @param options Options controlling agent behavior.
 * @param options.signal An abort signal used to destroy the agent on cancellation or timeout.
 * @param options.allowPrivateIPAddress Whether to allow requests to private IP addresses.
 * @param options.allowIPAddressList Private IP addresses or CIDR ranges that may be requested.
 * @returns An http or https agent configured for the URL.
 */
function buildAgent(
  url: string,
  options: {
    signal?: AbortSignal | null;
    allowPrivateIPAddress?: boolean;
    allowIPAddressList?: string[];
  } = {}
) {
  const proxyURL = getProxyForUrl(url);
  const filtering = {
    allowPrivateIPAddress: options.allowPrivateIPAddress,
    allowIPAddressList:
      options.allowIPAddressList ?? env.ALLOWED_PRIVATE_IP_ADDRESSES ?? [],
  };
  let agent: https.Agent | http.Agent;

  if (proxyURL) {
    Logger.silly("http", `Using proxy for request`, { url });
    agent =
      new URL(url).protocol === "https:"
        ? new FilteringHttpsProxyAgent(proxyURL, filtering)
        : new FilteringHttpProxyAgent(proxyURL, filtering);
  } else {
    agent = useFilteringAgent(url, { ...DefaultOptions, ...filtering });
  }

  if (options.signal) {
    options.signal.addEventListener("abort", () => {
      agent.destroy();
    });
  }

  return agent;
}
