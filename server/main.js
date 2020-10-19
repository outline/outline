// @flow
import http from "http";
import debug from "debug";
import IO from "socket.io";
import socketRedisAdapter from "socket.io-redis";
import SocketAuth from "socketio-auth";
import app from "./app";
import { Team, Document, Collection, View } from "./models";
import * as multiplayer from "./multiplayer";
import policy from "./policies";
import { client, subscriber } from "./redis";
import { getUserForJWT } from "./utils/jwt";

const server = http.createServer(app.callback());
const log = debug("server");

let io;

const { can } = policy;

io = IO(server, {
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

// receive multiplayer "sync" messages from other nodes (awareness and doc updates),
// applies data to doc if in memory otherwise the request is ignored
io.of("/").adapter.customHook = (event, callback) => {
  io.of("/").clients((err, socketIds) => {
    if (!socketIds.includes(event.socketId)) {
      multiplayer.handleRemoteSync(
        event.socketId,
        event.documentId,
        event.data
      );
    }
  });
  callback(true);
};

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
    log(`postAuthenticate ${socket.id}`);
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

    socket.on("sync", (event) => {
      // handleJoin must be called before handleSync to ensure authentication
      // to communicate changes for the document/socket combo. Messages received
      // before handleJoin will be logged and discarded.
      multiplayer.handleSync(
        socket,
        event.documentId,
        new Uint8Array(event.data)
      );

      // forward "sync" messages to all nodes (awareness and doc updates) so
      // that any docs held in memory can be kept up to date.
      // TODO: optimize by proactively keeping track of which nodes have doc in
      // memory? Perf gains for large horizontal scaling.
      io.of("/").adapter.customRequest(
        {
          socketId: socket.id,
          documentId: event.documentId,
          data: event.data,
        },
        (err) => {
          if (err) {
            log(err);
          }
        }
      );
    });

    // allow the client to request to join rooms
    socket.on("join", async (event) => {
      log("join", JSON.stringify(event));
      // user is joining a collection channel, because their permissions have
      // changed, granting them access.
      if (event.collectionId) {
        const collection = await Collection.scope({
          method: ["withMembership", user.id],
        }).findByPk(event.collectionId);

        if (can(user, "read", collection)) {
          socket.join(`collection-${event.collectionId}`);
        }
      }

      // user is joining a document channel, because they have navigated to
      // view a document.
      if (event.documentId) {
        const team = await Team.findByPk(user.teamId);
        const document = await Document.findByPk(event.documentId, {
          userId: user.id,
        });

        if (can(user, "read", document)) {
          const room = `document-${event.documentId}`;

          // new logic for multiplayer editing completely changes "presence"
          // detection and propagation, so split at a high-level here.
          if (team.multiplayerEditor) {
            socket.join(room, () => {
              socket.emit("user.join", {
                userId: user.id,
                documentId: event.documentId,
              });

              multiplayer.handleJoin({
                io,
                document,
                socket: socket,
                documentId: event.documentId,
              });
            });
          } else {
            // old deprecated logic to be removed in the future once multiplayer
            // has stabilized

            await View.touch(event.documentId, user.id);
            const editing = await View.findRecentlyEditingByDocument(
              event.documentId
            );

            socket.join(room, () => {
              // let everyone else in the room know that a new user joined
              io.to(room).emit("user.join", {
                userId: user.id,
                documentId: event.documentId,
                isEditing: event.isEditing,
              });

              // let this user know who else is already present in the room
              io.in(room).clients(async (err, socketIds) => {
                if (err) throw err;

                // because a single user can have multiple socket connections we
                // need to make sure that only unique userIds are returned. A Map
                // makes this easy.
                let userIds = new Map();
                for (const socketId of socketIds) {
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
      }
    });

    // allow the client to request to leave rooms
    socket.on("leave", (event) => {
      if (event.collectionId) {
        socket.leave(`collection-${event.collectionId}`);
      }
      if (event.documentId) {
        const room = `document-${event.documentId}`;
        socket.leave(room, () => {
          io.to(room).emit("user.leave", {
            userId: user.id,
            documentId: event.documentId,
          });
        });

        multiplayer.handleLeave(socket.id, event.documentId);
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
          multiplayer.handleLeave(socket.id, documentId);
        }
      });
    });

    socket.on("presence", async (event) => {
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

server.on("error", (err) => {
  throw err;
});

server.on("listening", () => {
  const address = server.address();
  console.log(`\n> Listening on http://localhost:${address.port}\n`);
});

server.listen(process.env.PORT || "3000");

export const socketio = io;

export default server;
