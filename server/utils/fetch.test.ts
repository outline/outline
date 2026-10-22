import dns from "node:dns";
import http from "node:http";
import type { MockInstance } from "vitest";
import env from "@server/env";
import { server as msw } from "@server/test/msw";
import fetch from "./fetch";

describe("fetch", () => {
  const allowedPrivateIPAddresses = env.ALLOWED_PRIVATE_IP_ADDRESSES;
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    // The request interceptor swallows socket errors from the filtering
    // agent, so these requests use the real network stack.
    msw.close();
    server = http.createServer((req, res) => {
      if (req.url === "/redirect") {
        res.writeHead(302, { Location: "https://127.0.0.1:1/" });
      }
      res.end("ok");
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const address = server.address();
    const port = address && typeof address === "object" ? address.port : 0;
    url = `http://127.0.0.1:${port}/`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    msw.listen({ onUnhandledRequest: "error" });
  });

  afterEach(() => {
    env.ALLOWED_PRIVATE_IP_ADDRESSES = allowedPrivateIPAddresses;
  });

  it("should block a private address", async () => {
    env.ALLOWED_PRIVATE_IP_ADDRESSES = [];

    await expect(fetch(url)).rejects.toMatchObject({ status: 400 });
  });

  it("should allow a private address in ALLOWED_PRIVATE_IP_ADDRESSES", async () => {
    env.ALLOWED_PRIVATE_IP_ADDRESSES = ["127.0.0.1"];

    const res = await fetch(url);
    expect(res.status).toEqual(200);
  });

  it("should block an allowed private address when given an empty allow list", async () => {
    env.ALLOWED_PRIVATE_IP_ADDRESSES = ["127.0.0.1"];

    await expect(fetch(url, { allowIPAddressList: [] })).rejects.toThrow();
  });

  it("should follow a redirect from http to https", async () => {
    env.ALLOWED_PRIVATE_IP_ADDRESSES = ["127.0.0.1"];

    await expect(fetch(`${url}redirect`)).rejects.toThrow("ECONNREFUSED");
  });

  describe("with a proxy", () => {
    let proxy: http.Server;
    let proxyURL: string;
    let received: { method?: string; url?: string; auth?: string }[];
    let connections: number;

    beforeAll(async () => {
      proxy = http.createServer((req, res) => {
        received.push({
          method: req.method,
          url: req.url,
          auth: req.headers["proxy-authorization"],
        });
        if (req.url === "http://192.0.2.1/redirect") {
          res.writeHead(302, { Location: "https://192.0.2.1/" });
        }
        if (req.url === "http://192.0.2.1/redirect-private") {
          res.writeHead(302, { Location: "http://10.0.0.1/" });
        }
        res.end("proxied");
      });
      proxy.on("connection", () => {
        connections++;
      });
      proxy.on("connect", (req, socket) => {
        received.push({
          method: req.method,
          url: req.url,
          auth: req.headers["proxy-authorization"],
        });
        socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
      });
      await new Promise<void>((resolve) =>
        proxy.listen(0, "127.0.0.1", resolve)
      );
      const address = proxy.address();
      const port = address && typeof address === "object" ? address.port : 0;
      proxyURL = `http://us%40er:p%40ss@127.0.0.1:${port}`;
    });

    beforeEach(() => {
      // TEST-NET-1 is never routed, so a request that skips the proxy fails.
      env.ALLOWED_PRIVATE_IP_ADDRESSES = ["192.0.2.1"];
      received = [];
      connections = 0;
      process.env.HTTP_PROXY = proxyURL;
      process.env.HTTPS_PROXY = proxyURL;
    });

    afterEach(() => {
      vi.restoreAllMocks();
      delete process.env.HTTP_PROXY;
      delete process.env.HTTPS_PROXY;
    });

    afterAll(async () => {
      await new Promise((resolve) => proxy.close(resolve));
    });

    it("should send an http request through the proxy", async () => {
      const res = await fetch("http://192.0.2.1/");

      expect(await res.text()).toEqual("proxied");
      expect(received).toEqual([
        {
          method: "GET",
          url: "http://192.0.2.1/",
          auth: `Basic ${Buffer.from("us@er:p@ss").toString("base64")}`,
        },
      ]);
    });

    it("should tunnel an https request through the proxy", async () => {
      const res = await fetch("https://192.0.2.1/");

      expect(res.status).toEqual(403);
      expect(received).toEqual([
        {
          method: "CONNECT",
          url: "192.0.2.1:443",
          auth: `Basic ${Buffer.from("us@er:p@ss").toString("base64")}`,
        },
      ]);
    });

    it("should tunnel an https redirect through the proxy", async () => {
      const res = await fetch("http://192.0.2.1/redirect");

      expect(res.status).toEqual(403);
      expect(received.map((request) => request.method)).toEqual([
        "GET",
        "CONNECT",
      ]);
    });

    it("should block a private target address", async () => {
      await expect(fetch("https://10.0.0.1/")).rejects.toMatchObject({
        status: 400,
      });
      expect(received).toEqual([]);
    });

    it("should block a protocol-relative path to a private address", async () => {
      await expect(fetch("http://192.0.2.1//10.0.0.1/")).rejects.toMatchObject({
        status: 400,
      });
      expect(received).toEqual([]);
    });

    it("should block a Host header with a private address", async () => {
      await expect(
        fetch("http://192.0.2.1/", { headers: { Host: "10.0.0.1" } })
      ).rejects.toMatchObject({ status: 400 });
      expect(received).toEqual([]);
    });

    it("should not connect to the proxy after a timeout", async () => {
      const lookupSpy: MockInstance = vi.spyOn(dns.promises, "lookup");
      lookupSpy.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return [{ address: "192.0.2.1", family: 4 }];
      });

      await expect(
        fetch("http://slow.example/", { timeout: 50 })
      ).rejects.toThrow("Request timeout after 50ms");
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(connections).toEqual(0);
    });

    it("should block a redirect to a private target address", async () => {
      await expect(
        fetch("http://192.0.2.1/redirect-private")
      ).rejects.toMatchObject({ status: 400 });
      expect(received.map((request) => request.url)).toEqual([
        "http://192.0.2.1/redirect-private",
      ]);
    });
  });
});
