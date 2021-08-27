// @flow
import http from "http";
import Koa from "koa";
import IO from "socket.io";
import socketRedisAdapter from "socket.io-redis";
import SocketAuth from "socketio-auth";
import env from "../env";
import { Document, Collection, View } from "../models";
import policy from "../policies";
import { websocketsQueue } from "../queues";
import WebsocketsProcessor from "../queues/processors/websockets";
import { client, subscriber } from "../redis";
import Sentry from "../sentry";
import { getUserForJWT } from "../utils/jwt";
import * as metrics from "../utils/metrics";

const { can } = policy;
const websockets = new WebsocketsProcessor();

export default function init(app: Koa, server: http.Server) {
  const io = IO(server, {
    path: "/realtime",
    serveClient: false,
    cookie: false,
  });

  io.adapter(
    socketRedisAdapter({
      pubClient: client,
      subClient: subscriber,
    })
  );

  io.origins((_, callback) => {
    callback(null, true);
  });

  io.of("/").adapter.on("error", (err) => {
    if (err.name === "MaxRetriesPerRequestError") {
      console.error(`Redis error: ${err.message}. Shutting down now.`);
      throw err;
    } else {
      console.error(`Redis error: ${err.message}`);
    }
  });

  io.on("connection", (socket) => {
    metrics.increment("websockets.connected");
    metrics.gaugePerInstance(
      "websockets.count",
      socket.client.conn.server.clientsCount
    );

    socket.on("disconnect", () => {
      metrics.increment("websockets.disconnected");
      metrics.gaugePerInstance(
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
        await client.hset(socket.id, "userId", user.id);

        return callback(null, true);
      } catch (err) {
        return callback(err);
      }
    },
    postAuthenticate: async (socket, data) => {
      const { user } = socket.client;

      // the rooms associated with the current team
      // and user so we can send authenticated events
      let rooms = [`team-${user.teamId}`, `user-${user.id}`];

      // the rooms associated with collections this user
      // has access to on connection. New collection subscriptions
      // are managed from the client as needed through the 'join' event
      const collectionIds = await user.collectionIds();
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
              metrics.increment("websockets.collections.join");
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
              metrics.increment("websockets.documents.join");

              // let everyone else in the room know that a new user joined
              io.to(room).emit("user.join", {
                userId: user.id,
                documentId: event.documentId,
                isEditing: event.isEditing,
              });

              // let this user know who else is already present in the room
              io.in(room).clients(async (err, sockets) => {
                if (err) {
                  if (process.env.SENTRY_DSN) {
                    Sentry.withScope(function (scope) {
                      scope.setExtra("clients", sockets);
                      Sentry.captureException(err);
                    });
                  } else {
                    console.error(err);
                  }
                  return;
                }

                // because a single user can have multiple socket connections we
                // need to make sure that only unique userIds are returned. A Map
                // makes this easy.
                let userIds = new Map();
                for (const socketId of sockets) {
                  const userId = await client.hget(socketId, "userId");
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
            metrics.increment("websockets.collections.leave");
          });
        }
        if (event.documentId) {
          const room = `document-${event.documentId}`;
          socket.leave(room, () => {
            metrics.increment("websockets.documents.leave");

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
        metrics.increment("websockets.presence");

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

  websocketsQueue.process(async function websocketEventsProcessor(job) {
    const event = job.data;
    websockets.on(event, io).catch((error) => {
      if (env.SENTRY_DSN) {
        Sentry.withScope(function (scope) {
          scope.setExtra("event", event);
          Sentry.captureException(error);
        });
      } else {
        throw error;
      }
    });
  });
}
