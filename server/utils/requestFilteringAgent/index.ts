/* oxlint-disable no-restricted-imports */
// Vendored from request-filtering-agent v3.2.0 (MIT, by azu).
// Source: https://github.com/azu/request-filtering-agent/blob/cc0f9fcb9e700cd4246db2ea36245439eede4096/src/request-filtering-agent.ts
// License: see ./LICENSE.md
//
// Vendored to:
//   1. Expose validateIPAddress so the proxy pre-flight check in
//      server/utils/fetch.ts can reuse the exact same SSRF rules without
//      duplicating them.
//   2. Avoid the upstream package's pure-ESM publish.
//
// When upgrading, diff against upstream and port any changes here.

import * as http from "node:http";
import * as https from "node:https";
import * as net from "node:net";
import * as dns from "node:dns";
import type { TcpNetConnectOpts } from "node:net";
import type { Duplex } from "node:stream";
import ipaddr from "ipaddr.js";
import Logger from "@server/logging/Logger";

export interface RequestFilteringAgentOptions {
  /**
   * Allow connections to private IP addresses (RFC1918, loopback, link-local,
   * etc). Defaults to false.
   */
  allowPrivateIPAddress?: boolean;
  /**
   * Allow connections to the unspecified meta address (0.0.0.0 / ::).
   * Defaults to false.
   */
  allowMetaIPAddress?: boolean;
  /**
   * Explicit allow list of IPs or CIDR ranges. Takes precedence over the
   * private/meta/deny checks.
   */
  allowIPAddressList?: string[];
  /**
   * Explicit deny list of IPs or CIDR ranges.
   */
  denyIPAddressList?: string[];
}

export const DefaultRequestFilteringAgentOptions: Required<RequestFilteringAgentOptions> =
  {
    allowPrivateIPAddress: false,
    allowMetaIPAddress: false,
    allowIPAddressList: [],
    denyIPAddressList: [],
  };

const matchIPAddress = ({
  targetAddress,
  ipAddressList,
  listName,
}: {
  targetAddress: {
    raw: string;
    parsed: ipaddr.IPv4 | ipaddr.IPv6;
  };
  ipAddressList: string[];
  listName: string;
}): boolean => {
  for (const ipOrCIDR of ipAddressList) {
    if (net.isIP(ipOrCIDR) !== 0) {
      if (ipOrCIDR === targetAddress.raw) {
        return true;
      }
    } else {
      try {
        const cidr = ipaddr.parseCIDR(ipOrCIDR);
        if (targetAddress.parsed.match(cidr)) {
          return true;
        }
      } catch (e) {
        Logger.warn(
          `[request-filtering-agent] Invalid CIDR in ${listName}: ${ipOrCIDR}`,
          { error: e }
        );
      }
    }
  }
  return false;
};

/**
 * Validate a resolved IP address against the configured filtering rules.
 *
 * @param input The resolved address (and optional host/family for richer error messages).
 * @param options Allow/deny rules to apply (undefined values fall back to defaults).
 * @returns An Error if the address is disallowed, otherwise undefined.
 */
export const validateIPAddress = (
  {
    address,
    host,
    family,
  }: { address: string; host?: string; family?: string | number },
  options: RequestFilteringAgentOptions = {}
): undefined | Error => {
  if (net.isIP(address) === 0) {
    return;
  }
  const resolved: Required<RequestFilteringAgentOptions> = {
    ...DefaultRequestFilteringAgentOptions,
    ...options,
  };
  try {
    const parsedAddr = ipaddr.parse(address);
    if (resolved.allowIPAddressList.length > 0) {
      if (
        matchIPAddress({
          targetAddress: { raw: address, parsed: parsedAddr },
          ipAddressList: resolved.allowIPAddressList,
          listName: "allowIPAddressList",
        })
      ) {
        return;
      }
    }
    const range = parsedAddr.range();
    if (!resolved.allowMetaIPAddress) {
      if (range === "unspecified") {
        return new Error(
          `DNS lookup ${address}(family:${family}, host:${host}) is not allowed. Because, It is meta IP address.`
        );
      }
    }
    if (!resolved.allowPrivateIPAddress && range !== "unicast") {
      return new Error(
        `DNS lookup ${address}(family:${family}, host:${host}) is not allowed. Because, It is private IP address.`
      );
    }
    if (resolved.denyIPAddressList.length > 0) {
      if (
        matchIPAddress({
          targetAddress: { raw: address, parsed: parsedAddr },
          ipAddressList: resolved.denyIPAddressList,
          listName: "denyIPAddressList",
        })
      ) {
        return new Error(
          `DNS lookup ${address}(family:${family}, host:${host}) is not allowed. Because It is defined in denyIPAddressList.`
        );
      }
    }
  } catch (error) {
    return error as Error;
  }
  return;
};

type LookupOneCallback = (
  err: NodeJS.ErrnoException | null,
  address?: string,
  family?: number
) => void;
type LookupAllCallback = (
  err: NodeJS.ErrnoException | null,
  addresses?: dns.LookupAddress[]
) => void;
type LookupCallback = LookupOneCallback | LookupAllCallback;

const makeLookup =
  (
    createConnectionOptions: TcpNetConnectOpts,
    requestFilterOptions: Required<RequestFilteringAgentOptions>
  ): Required<net.TcpSocketConnectOpts>["lookup"] =>
  // @ts-expect-error - @types/node has a poor definition of this callback
  (hostname, options, cb: LookupCallback) => {
    const lookup = createConnectionOptions.lookup || dns.lookup;
    let lookupCb: LookupCallback;
    if (options.all) {
      lookupCb = ((err, addresses) => {
        if (err) {
          cb(err);
          return;
        }
        for (const { address, family } of addresses!) {
          const validationError = validateIPAddress(
            { address, family, host: hostname },
            requestFilterOptions
          );
          if (validationError) {
            cb(validationError);
            return;
          }
        }
        (cb as LookupAllCallback)(null, addresses);
      }) as LookupAllCallback;
    } else {
      lookupCb = ((err, address, family) => {
        if (err) {
          cb(err);
          return;
        }
        const validationError = validateIPAddress(
          { address: address!, family: family!, host: hostname },
          requestFilterOptions
        );
        if (validationError) {
          cb(validationError);
          return;
        }
        (cb as LookupOneCallback)(null, address!, family!);
      }) as LookupOneCallback;
    }
    // @ts-expect-error - @types/node has a poor definition of this callback
    lookup(hostname, options, lookupCb);
  };

const resolveOptions = (
  options?: RequestFilteringAgentOptions
): Required<RequestFilteringAgentOptions> => ({
  ...DefaultRequestFilteringAgentOptions,
  ...options,
});

/**
 * An http.Agent that rejects connections to disallowed IP addresses.
 */
export class RequestFilteringHttpAgent extends http.Agent {
  private requestFilterOptions: Required<RequestFilteringAgentOptions>;

  constructor(options?: http.AgentOptions & RequestFilteringAgentOptions) {
    super(options);
    this.requestFilterOptions = resolveOptions(options);
  }

  createConnection(
    options: TcpNetConnectOpts,
    connectionListener?: (error: Error | null, socket: Duplex) => void
  ) {
    const { host } = options;
    if (host !== undefined) {
      const validationError = validateIPAddress(
        { address: host },
        this.requestFilterOptions
      );
      if (validationError) {
        throw validationError;
      }
    }
    return super.createConnection(
      { ...options, lookup: makeLookup(options, this.requestFilterOptions) },
      connectionListener
    );
  }
}

/**
 * An https.Agent that rejects connections to disallowed IP addresses.
 */
export class RequestFilteringHttpsAgent extends https.Agent {
  private requestFilterOptions: Required<RequestFilteringAgentOptions>;

  constructor(options?: https.AgentOptions & RequestFilteringAgentOptions) {
    super(options);
    this.requestFilterOptions = resolveOptions(options);
  }

  createConnection(
    options: TcpNetConnectOpts,
    connectionListener?: (error: Error | null, socket: Duplex) => void
  ) {
    const { host } = options;
    if (host !== undefined) {
      const validationError = validateIPAddress(
        { address: host },
        this.requestFilterOptions
      );
      if (validationError) {
        throw validationError;
      }
    }
    return super.createConnection(
      { ...options, lookup: makeLookup(options, this.requestFilterOptions) },
      connectionListener
    );
  }
}

export const globalHttpAgent = new RequestFilteringHttpAgent();
export const globalHttpsAgent = new RequestFilteringHttpsAgent();

/**
 * Get a filtering agent for the given URL. Returns a process-global agent when
 * no options are provided, otherwise constructs a fresh one.
 *
 * @param url The target URL — used only to pick http vs https.
 * @param options Optional filtering and underlying agent options.
 * @returns A filtering http or https agent.
 */
export const useAgent = (
  url: string,
  options?: https.AgentOptions & RequestFilteringAgentOptions
) => {
  if (!options) {
    return url.startsWith("https") ? globalHttpsAgent : globalHttpAgent;
  }
  return url.startsWith("https")
    ? new RequestFilteringHttpsAgent(options)
    : new RequestFilteringHttpAgent(options);
};
