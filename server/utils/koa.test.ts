import http from "node:http";
import { getClientAbortSignal } from "./koa";

/**
 * Start a server that gives the signal of each request to the handler.
 *
 * @param handle Called with the response and its signal for each request.
 * @returns The server and its port.
 */
async function startServer(
  handle: (res: http.ServerResponse, signal: AbortSignal) => void
) {
  const server = http.createServer((_req, res) => {
    handle(res, getClientAbortSignal(res));
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Server is not listening on a port");
  }
  return { server, port: address.port };
}

describe("getClientAbortSignal", () => {
  it("should abort when the connection closes before the response is sent", async () => {
    let handleSignal: (signal: AbortSignal) => void = () => {};
    const received = new Promise<AbortSignal>((resolve) => {
      handleSignal = resolve;
    });
    const { server, port } = await startServer((_res, signal) => {
      handleSignal(signal);
    });
    server.setTimeout(50);

    const req = http.request({ port, method: "POST" });
    req.on("error", () => {});
    req.end();

    const signal = await received;
    await new Promise<void>((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }
      signal.addEventListener("abort", () => resolve(), { once: true });
    });
    server.close();

    expect(signal.aborted).toBe(true);
  });

  it("should not abort when the response is sent in full", async () => {
    let signal: AbortSignal | undefined;
    const { server, port } = await startServer((res, s) => {
      signal = s;
      res.end("ok");
    });

    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        { port, method: "POST", agent: false },
        (res) => {
          res.resume();
          res.on("end", resolve);
        }
      );
      req.on("error", reject);
      req.end();
    });
    await new Promise<void>((resolve) => server.close(() => resolve()));

    expect(signal?.aborted).toBe(false);
  });
});
