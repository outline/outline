import { once } from "node:events";
import http from "node:http";
import { Socket } from "node:net";
import { PassThrough } from "node:stream";
import Logger from "@server/logging/Logger";
import onupgrade, { rejectUnhandledUpgrades, rejectUpgrade } from "./onupgrade";

const request = () => new http.IncomingMessage(new Socket());

describe("onupgrade", () => {
  it("should swallow expected disconnections without reporting them", () => {
    const errorSpy = vi.spyOn(Logger, "error");
    const server = http.createServer();
    const socket = new PassThrough();
    onupgrade(server);

    server.emit("upgrade", request(), socket);

    expect(() => {
      socket.emit(
        "error",
        Object.assign(new Error("read ECONNRESET"), {
          code: "ECONNRESET",
        })
      );
    }).not.toThrow();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("should report unexpected errors", () => {
    const errorSpy = vi.spyOn(Logger, "error").mockImplementation(() => {});
    const server = http.createServer();
    const socket = new PassThrough();
    onupgrade(server);

    server.emit("upgrade", request(), socket);
    socket.emit("error", new Error("something unexpected"));

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("rejectUnhandledUpgrades", () => {
  it("should close upgrade requests when no service handles them", async () => {
    const server = http.createServer();
    const socket = new PassThrough();
    onupgrade(server);
    rejectUnhandledUpgrades(server);

    server.emit("upgrade", request(), socket);
    await once(socket, "close");

    expect(socket.destroyed).toEqual(true);
  });

  it("should leave upgrade requests alone when a service handles them", () => {
    const server = http.createServer();
    const socket = new PassThrough();
    onupgrade(server);
    server.on("upgrade", () => undefined);
    rejectUnhandledUpgrades(server);

    server.emit("upgrade", request(), socket);

    expect(socket.destroyed).toEqual(false);
  });
});

describe("rejectUpgrade", () => {
  it("should write a complete response and destroy the socket", async () => {
    const socket = new PassThrough();
    const chunks: Buffer[] = [];
    socket.on("data", (chunk: Buffer) => chunks.push(chunk));

    rejectUpgrade(socket);
    await once(socket, "close");

    expect(Buffer.concat(chunks).toString()).toEqual(
      "HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n"
    );
    expect(socket.destroyed).toEqual(true);
  });
});
