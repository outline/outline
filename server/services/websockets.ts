import http from "http";
import Koa from "koa";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'sock... Remove this comment to see the full error message
import IO from "socket.io";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'sock... Remove this comment to see the full error message
import socketRedisAdapter from "socket.io-redis";
import SocketAuth from "socketio-auth";
import Logger from "@server/logging/logger";
import Metrics from "@server/logging/metrics";
import { Document, Collection, View } from "@server/models";
import { getUserForJWT } from "@server/utils/jwt";
import policy from "../policies";
import { websocketsQueue } from "../queues";
import WebsocketsProcessor from "../queues/processors/websockets";
import { client, subscriber } from "../redis";

const { can } = policy;

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
  // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'Function | undefined' is not ass... Remove this comment to see the full error message
  server.removeListener("upgrade", ioHandleUpgrade);
  server.on("upgrade", function (req, socket, head) {
    // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
    if (req.url.indexOf(path) > -1) {
      // @ts-expect-error ts-migrate(2722) FIXME: Cannot invoke an object which is possibly 'undefin... Remove this comment to see the full error message
      ioHandleUpgrade(req, socket, head);
    }
  });
  server.on("shutdown", () => {
    Metrics.gaugePerInstance("websockets.count", 0);
  });
  io.adapter(
    socketRedisAdapter({
      pubClient: client,
      subClient: subscriber,
    })
  );
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter '_' implicitly has an 'any' type.
  io.origins((_, callback) => {
    callback(null, true);
  });
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
  io.of("/").adapter.on("error", (err) => {
    if (err.name === "MaxRetriesPerRequestError") {
      Logger.error("Redis maximum retries exceeded in socketio adapter", err);
      throw err;
    } else {
      Logger.error("Redis error in socketio adapter", err);
    }
  });
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'socket' implicitly has an 'any' type.
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
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'socket' implicitly has an 'any' type.
    authenticate: async (socket, data, callback) => {
      const { token } = data;

      try {
        const user = await getUserForJWT(token);
        socket.client.user = user;
        // store the mapping between socket id and user id in redis
        // so that it is accessible across multiple server nodes
        await client.hset(socket.id, "userId", user.id);
        return callback(null, true);
      } catch (err) {
        return callback(err);
      }
    },
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'socket' implicitly has an 'any' type.
    postAuthenticate: async (socket) => {
      const { user } = socket.client;
      // the rooms associated with the current team
      // and user so we can send authenticated events
      const rooms = [`team-${user.teamId}`, `user-${user.id}`];
      // the rooms associated with collections this user
      // has access to on connection. New collection subscriptions
      // are managed from the client as needed through the 'join' event
      const collectionIds = await user.collectionIds();
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'collectionId' implicitly has an 'any' t... Remove this comment to see the full error message
      collectionIds.forEach((collectionId) =>
        rooms.push(`collection-${collectionId}`)
      );
      // join all of the rooms at once
      socket.join(rooms);
      // allow the client to request to join rooms
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'event' implicitly has an 'any' type.
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
              // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
              io.in(room).clients(async (err, sockets) => {
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
                  const userId = await client.hget(socketId, "userId");
                  userIds.set(userId, userId);
                }

                socket.emit("document.presence", {
                  documentId: event.documentId,
                  userIds: Array.from(userIds.keys()),
                  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'view' implicitly has an 'any' type.
                  editingIds: editing.map((view) => view.userId),
                });
              });
            });
          }
        }
      });
      // allow the client to request to leave rooms
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'event' implicitly has an 'any' type.
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

      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'event' implicitly has an 'any' type.
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
  websocketsQueue.process(async function websocketEventsProcessor(job) {
    const event = job.data;
    websockets.on(event, io).catch((error) => {
      Logger.error("Error processing websocket event", error, {
        event,
      });
    });
  });
}
