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
    server = http.createServer((_req, res) => res.end("ok"));
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
});
