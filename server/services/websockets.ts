import http from "http";
import invariant from "invariant";
import Koa from "koa";
import IO from "socket.io";
import socketRedisAdapter from "socket.io-redis";
import SocketAuth from "socketio-auth";
import Logger from "@server/logging/Logger";
import Metrics from "@server/logging/metrics";
import { Document, Collection, View } from "@server/models";
import { can } from "@server/policies";
import { getUserForJWT } from "@server/utils/jwt";
import { websocketQueue } from "../queues";
import WebsocketsProcessor from "../queues/processors/WebsocketsProcessor";
import Redis from "../redis";

export default function init(app: Koa, server: http.Server) {
  const path = "/realtime";

  // Websockets for events and non-collaborative documents
  const io = IO(server, {
    path,
    serveClient: false,
    cookie: false,
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

  server.on("upgrade", function (req, socket, head) {
    if (req.url && req.url.indexOf(path) > -1) {
      invariant(ioHandleUpgrade, "Existing upgrade handler must exist");
      ioHandleUpgrade(req, socket, head);
    }
  });

  server.on("shutdown", () => {
    Metrics.gaugePerInstance("websockets.count", 0);
  });

  io.adapter(
    socketRedisAdapter({
      pubClient: Redis.defaultClient,
      subClient: Redis.defaultSubscriber,
    })
  );

  io.origins((_req, callback) => {
    callback(null, true);
  });

  io.of("/").adapter.on("error", (err: Error) => {
    if (err.name === "MaxRetriesPerRequestError") {
      Logger.error("Redis maximum retries exceeded in socketio adapter", err);
      throw err;
    } else {
      Logger.error("Redis error in socketio adapter", err);
    }
  });

  io.on("connection", (socket) => {
    Metrics.increment("websockets.connected");
    Metrics.gaugePerInstance(
      "websockets.count",
      socket.client.conn.server.clientsCount
    );
    socket.on("disconnect", () => {
      Metrics.increment("websockets.disconnected");
      Metrics.gaugePerInstance(
        "websockets.count",
        socket.client.conn.server.clientsCount
      );
    });
  });

  SocketAuth(io, {
    authenticate: async (socket, data, callback) => {
      const { token } = data;

      try {
        const user = await getUserForJWT(token);
        socket.client.user = user;

        // store the mapping between socket id and user id in redis
        // so that it is accessible across multiple server nodes
        await Redis.defaultClient.hset(socket.id, "userId", user.id);
        return callback(null, true);
      } catch (err) {
        return callback(err, false);
      }
    },

    postAuthenticate: async (socket) => {
      const { user } = socket.client;

      // the rooms associated with the current team
      // and user so we can send authenticated events
      const rooms = [`team-${user.teamId}`, `user-${user.id}`];

      // the rooms associated with collections this user
      // has access to on connection. New collection subscriptions
      // are managed from the client as needed through the 'join' event
      const collectionIds: string[] = await user.collectionIds();

      collectionIds.forEach((collectionId) =>
        rooms.push(`collection-${collectionId}`)
      );

      // join all of the rooms at once
      socket.join(rooms);

      // allow the client to request to join rooms
      socket.on("join", async (event) => {
        // user is joining a collection channel, because their permissions have
        // changed, granting them access.
        if (event.collectionId) {
          const collection = await Collection.scope({
            method: ["withMembership", user.id],
          }).findByPk(event.collectionId);

          if (can(user, "read", collection)) {
            socket.join(`collection-${event.collectionId}`, () => {
              Metrics.increment("websockets.collections.join");
            });
          }
        }

        // user is joining a document channel, because they have navigated to
        // view a document.
        if (event.documentId) {
          const document = await Document.findByPk(event.documentId, {
            userId: user.id,
          });

          if (can(user, "read", document)) {
            const room = `document-${event.documentId}`;
            await View.touch(event.documentId, user.id, event.isEditing);
            const editing = await View.findRecentlyEditingByDocument(
              event.documentId
            );

            socket.join(room, () => {
              Metrics.increment("websockets.documents.join");

              // let everyone else in the room know that a new user joined
              io.to(room).emit("user.join", {
                userId: user.id,
                documentId: event.documentId,
                isEditing: event.isEditing,
              });

              // let this user know who else is already present in the room
              io.in(room).clients(async (err: Error, sockets: string[]) => {
                if (err) {
                  Logger.error("Error getting clients for room", err, {
                    sockets,
                  });
                  return;
                }

                // because a single user can have multiple socket connections we
                // need to make sure that only unique userIds are returned. A Map
                // makes this easy.
                const userIds = new Map();

                for (const socketId of sockets) {
                  const userId = await Redis.defaultClient.hget(
                    socketId,
                    "userId"
                  );
                  userIds.set(userId, userId);
                }

                socket.emit("document.presence", {
                  documentId: event.documentId,
                  userIds: Array.from(userIds.keys()),
                  editingIds: editing.map((view) => view.userId),
                });
              });
            });
          }
        }
      });

      // allow the client to request to leave rooms
      socket.on("leave", (event) => {
        if (event.collectionId) {
          socket.leave(`collection-${event.collectionId}`, () => {
            Metrics.increment("websockets.collections.leave");
          });
        }

        if (event.documentId) {
          const room = `document-${event.documentId}`;

          socket.leave(room, () => {
            Metrics.increment("websockets.documents.leave");
            io.to(room).emit("user.leave", {
              userId: user.id,
              documentId: event.documentId,
            });
          });
        }
      });

      socket.on("disconnecting", () => {
        const rooms = Object.keys(socket.rooms);

        rooms.forEach((room) => {
          if (room.startsWith("document-")) {
            const documentId = room.replace("document-", "");
            io.to(room).emit("user.leave", {
              userId: user.id,
              documentId,
            });
          }
        });
      });

      socket.on("presence", async (event) => {
        Metrics.increment("websockets.presence");
        const room = `document-${event.documentId}`;

        if (event.documentId && socket.rooms[room]) {
          const view = await View.touch(
            event.documentId,
            user.id,
            event.isEditing
          );

          view.user = user;
          io.to(room).emit("user.presence", {
            userId: user.id,
            documentId: event.documentId,
            isEditing: event.isEditing,
          });
        }
      });
    },
  });

  // Handle events from event queue that should be sent to the clients down ws
  const websockets = new WebsocketsProcessor();
  websocketQueue.process(async function websocketEventsProcessor(job) {
    const event = job.data;
    websockets.perform(event, io).catch((error) => {
      Logger.error("Error processing websocket event", error, {
        event,
      });
    });
  });
}
