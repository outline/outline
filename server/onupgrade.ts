import type http from "node:http";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import Logger from "@server/logging/Logger";

/**
 * Attach an error handler to every socket that is detached from the HTTP server
 * by an upgrade request. Node removes its own handling before emitting the
 * "upgrade" event, so without a listener a socket error is unhandled and will
 * terminate the process.
 *
 * Must be called before any service adds an upgrade listener of its own.
 *
 * @param server the server to handle upgrade requests for.
 */
export default function onupgrade(server: http.Server) {
  server.on("upgrade", (req: IncomingMessage, socket: Duplex) => {
    socket.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code && expectedErrorCodes.includes(error.code)) {
        return;
      }

      Logger.error("Socket error during websocket upgrade", error, {}, req);
    });
  });
}

/**
 * Reject upgrade requests when no service has taken responsibility for them,
 * they would otherwise be left open indefinitely – the error handler attached
 * by `onupgrade` is itself a listener, which stops Node closing them for us.
 *
 * @param server the server, once all of its services have been started.
 */
export function rejectUnhandledUpgrades(server: http.Server) {
  if (server.listenerCount("upgrade") > 1) {
    return;
  }

  server.on("upgrade", (_req: IncomingMessage, socket: Duplex) =>
    rejectUpgrade(socket)
  );
}

/**
 * Reject an upgrade request with a bad request response and close the socket.
 *
 * @param socket the socket to respond on.
 */
export function rejectUpgrade(socket: Duplex) {
  if (!socket.writable) {
    socket.destroy();
    return;
  }

  socket.end(
    `HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
    () => socket.destroy()
  );
}

/**
 * Socket errors that are the result of a client, or an intermediary such as a
 * reverse proxy, going away. They are expected and not worth reporting.
 */
const expectedErrorCodes = ["ECONNRESET", "ECONNABORTED", "EPIPE", "ETIMEDOUT"];
