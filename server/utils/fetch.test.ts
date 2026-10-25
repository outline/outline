import http from "node:http";
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
      if (req.url === "/stall-headers") {
        return;
      }
      if (req.url === "/stall-body") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.write("partial");
        return;
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
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    msw.listen({ onUnhandledRequest: "error" });
  });

  afterEach(() => {
    env.ALLOWED_PRIVATE_IP_ADDRESSES = allowedPrivateIPAddresses;
  });

  it("should block a private address", async () => {
    env.ALLOWED_PRIVATE_IP_ADDRESSES = [];

    await expect(fetch(url)).rejects.toThrow();
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

  describe("timeout", () => {
    beforeEach(() => {
      env.ALLOWED_PRIVATE_IP_ADDRESSES = ["127.0.0.1"];
    });

    it("should throw a timeout error when headers do not arrive", async () => {
      await expect(
        fetch(`${url}stall-headers`, { timeout: 100 })
      ).rejects.toThrow("Request timeout after 100ms");
    });

    it("should abort a stalled response body", async () => {
      const res = await fetch(`${url}stall-body`, { timeout: 100 });

      await expect(res.text()).rejects.toMatchObject({ name: "AbortError" });
    });

    it("should apply the timeout when a signal is also given", async () => {
      const controller = new AbortController();

      await expect(
        fetch(`${url}stall-headers`, {
          timeout: 100,
          signal: controller.signal,
        })
      ).rejects.toThrow("Request timeout after 100ms");
    });

    it("should rethrow a caller abort unchanged", async () => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 50);

      const err = await fetch(`${url}stall-headers`, {
        timeout: 5000,
        signal: controller.signal,
      }).catch((e: unknown) => e);

      expect(err).toMatchObject({ name: "AbortError" });
      expect(err).not.toMatchObject({
        message: expect.stringContaining("timeout"),
      });
    });
  });
});
