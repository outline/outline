import http, { IncomingMessage } from "http";
import { Duplex } from "stream";
import cookie from "cookie";
import Koa from "koa";
import IO from "socket.io";
import { createAdapter } from "socket.io-redis";
import env from "@server/env";
import { AuthenticationError } from "@server/errors";
import Logger from "@server/logging/Logger";
import Metrics from "@server/logging/Metrics";
import * as Tracing from "@server/logging/tracer";
import { traceFunction } from "@server/logging/tracing";
import { Collection, Group, User } from "@server/models";
import { can } from "@server/policies";
import Redis from "@server/storage/redis";
import ShutdownHelper, { ShutdownOrder } from "@server/utils/ShutdownHelper";
import { getUserForJWT } from "@server/utils/jwt";
import { websocketQueue } from "../queues";
import WebsocketsProcessor from "../queues/processors/WebsocketsProcessor";

type SocketWithAuth = IO.Socket & {
  client: IO.Socket["client"] & {
    user?: User;
  };
};

export default function init(
  app: Koa,
  server: http.Server,
  serviceNames: string[]
) {
  const path = "/realtime";

  // Websockets for events and non-collaborative documents
  const io = new IO.Server(server, {
    path,
    serveClient: false,
    cookie: false,
    pingInterval: 15000,
    pingTimeout: 30000,
    cors: {
      // Included for completeness, though CORS does not apply to websocket transport.
      origin: env.isCloudHosted ? "*" : env.URL,
      methods: ["GET", "POST"],
    },
  });

  // Remove the upgrade handler that we just added when registering the IO engine
  // And re-add it with a check to only handle the realtime path, this allows
  // collaboration websockets to exist in the same process as engine.io.
  const listeners = server.listeners("upgrade");
  const ioHandleUpgrade = listeners.pop();

  if (ioHandleUpgrade) {
    server.removeListener(
      "upgrade",
      ioHandleUpgrade as (...args: any[]) => void
    );
  }

  server.on(
    "upgrade",
    function (req: IncomingMessage, socket: Duplex, head: Buffer) {
      if (req.url?.startsWith(path) && ioHandleUpgrade) {
        // For on-premise deployments, ensure the websocket origin matches the deployed URL.
        // In cloud-hosted we support any origin for custom domains.
        if (
          !env.isCloudHosted &&
          (!req.headers.origin || !env.URL.startsWith(req.headers.origin))
        ) {
          socket.end(`HTTP/1.1 400 Bad Request\r\n`);
          return;
        }

        ioHandleUpgrade(req, socket, head);
        return;
      }

      if (serviceNames.includes("collaboration")) {
        // Nothing to do, the collaboration service will handle this request
        return;
      }

      // If the collaboration service isn't running then we need to close the connection
      socket.end(`HTTP/1.1 400 Bad Request\r\n`);
    }
  );

  ShutdownHelper.add("websockets", ShutdownOrder.normal, async () => {
    Metrics.gaugePerInstance("websockets.count", 0);
  });

  io.adapter(
    createAdapter({
      pubClient: Redis.defaultClient,
      subClient: Redis.defaultSubscriber,
    })
  );

  io.of("/").adapter.on("error", (err: Error) => {
    if (err.name === "MaxRetriesPerRequestError") {
      Logger.fatal("Redis maximum retries exceeded in socketio adapter", err);
    } else {
      Logger.error("Redis error in socketio adapter", err);
    }
  });

  io.on("connection", async (socket: SocketWithAuth) => {
    Metrics.increment("websockets.connected");
    Metrics.gaugePerInstance("websockets.count", io.engine.clientsCount);

    socket.on("disconnect", async () => {
      Metrics.increment("websockets.disconnected");
      Metrics.gaugePerInstance("websockets.count", io.engine.clientsCount);
    });

    setTimeout(function () {
      // If the socket didn't authenticate after connection, disconnect it
      if (!socket.client.user) {
        Logger.debug("websockets", `Disconnecting socket ${socket.id}`);

        // @ts-expect-error should be boolean
        socket.disconnect("unauthorized");
      }
    }, 1000);

    try {
      await authenticate(socket);
      Logger.debug("websockets", `Authenticated socket ${socket.id}`);

      socket.emit("authenticated", true);
      void authenticated(io, socket);
    } catch (err) {
      Logger.debug("websockets", `Authentication error socket ${socket.id}`, {
        error: err.message,
      });
      socket.emit("unauthorized", { message: err.message }, function () {
        socket.disconnect();
      });
    }
  });

  // Handle events from event queue that should be sent to the clients down ws
  const websockets = new WebsocketsProcessor();
  websocketQueue
    .process(
      traceFunction({
        serviceName: "websockets",
        spanName: "process",
        isRoot: true,
      })(async function (job) {
        const event = job.data;

        Tracing.setResource(`Processor.WebsocketsProcessor`);

        websockets.perform(event, io).catch((error) => {
          Logger.error("Error processing websocket event", error, {
            event,
          });
        });
      })
    )
    .catch((err) => {
      Logger.fatal("Error starting websocketQueue", err);
    });
}

async function authenticated(io: IO.Server, socket: SocketWithAuth) {
  const { user } = socket.client;
  if (!user) {
    throw new Error("User not returned from auth");
  }

  // the rooms associated with the current team
  // and user so we can send authenticated events
  const rooms = [`team-${user.teamId}`, `user-${user.id}`];

  // the rooms associated with collections this user has access to on
  // connection. New collection and group subscriptions are managed
  // from the client as needed through the 'join' event.
  const [collectionIds, groupIds] = await Promise.all([
    user.collectionIds(),
    user.groupIds(),
  ]);

  collectionIds.forEach((colId) => rooms.push(`collection-${colId}`));
  groupIds.forEach((groupId) => rooms.push(`group-${groupId}`));

  // allow the client to request to join rooms
  socket.on("join", async (event) => {
    // user is joining a collection channel, because their permissions have
    // changed, granting them access.
    if (event.collectionId) {
      const collection = await Collection.scope({
        method: ["withMembership", user.id],
      }).findByPk(event.collectionId);

      if (can(user, "read", collection)) {
        await socket.join(`collection-${event.collectionId}`);
      }
    }
    if (event.groupId) {
      const group = await Group.scope({
        method: ["withMembership", user.id],
      }).findByPk(event.groupId);

      if (can(user, "read", group)) {
        await socket.join(`group-${event.groupId}`);
      }
    }
  });

  // allow the client to request to leave rooms
  socket.on("leave", async (event) => {
    if (event.collectionId) {
      await socket.leave(`collection-${event.collectionId}`);
    }
    if (event.groupId) {
      await socket.leave(`group-${event.groupId}`);
    }
  });

  // join all of the rooms at once
  await socket.join(rooms);
}

/**
 * Authenticate the socket with the given token, attach the user model for the
 * duration of the session.
 */
async function authenticate(socket: SocketWithAuth) {
  const cookies = socket.request.headers.cookie
    ? cookie.parse(socket.request.headers.cookie)
    : {};
  const { accessToken } = cookies;

  if (!accessToken) {
    throw AuthenticationError("No access token");
  }

  const user = await getUserForJWT(accessToken);
  socket.client.user = user;
  return user;
}
