declare module "tunnel-agent" {
  import { Agent as HttpAgent } from "node:http";
  import { Agent as HttpsAgent } from "node:https";

  interface TunnelOptions {
    proxy: {
      host: string | null;
      port: string | number | null;
      proxyAuth?: string | null;
      headers?: { [key: string]: string };
    };
    ca?: Buffer[] | Buffer;
    cert?: Buffer | string;
    key?: Buffer | string;
    passphrase?: string;
    rejectUnauthorized?: boolean;
    secureOptions?: number;
    secureProtocol?: string;
    ciphers?: string;
    localAddress?: string;
    maxSockets?: number;
    keepAlive?: boolean;
    keepAliveMsecs?: number;
  }

  export interface TunnelAgent {
    httpOverHttp: (options: TunnelOptions) => HttpAgent;
    httpsOverHttp: (options: TunnelOptions) => HttpsAgent;
    httpOverHttps: (options: TunnelOptions) => HttpAgent;
    httpsOverHttps: (options: TunnelOptions) => HttpsAgent;
  }

  const tunnel: TunnelAgent;
  export = tunnel;
}
