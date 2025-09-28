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

// Excalidraw collaboration types
interface ExcalidrawCollaborator {
  socketId: string;
  userId: string;
  name: string;
}

interface ExcalidrawRoom {
  roomId: string;
  documentId: string;
  collaborators: Map<string, ExcalidrawCollaborator>; // socket ID -> collaborator info
  createdAt: Date;
  lastActivity: Date;
}

// Global state for Excalidraw rooms
const excalidrawRooms = new Map<string, ExcalidrawRoom>();

// Helper function to get or create an Excalidraw room
function getOrCreateExcalidrawRoom(roomId: string, documentId: string): ExcalidrawRoom {
  let room = excalidrawRooms.get(roomId);
  if (!room) {
    room = {
      roomId,
      documentId,
      collaborators: new Map(),
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    excalidrawRooms.set(roomId, room);
    Logger.debug("websockets", `Created Excalidraw room: ${roomId}`);
  }
  room.lastActivity = new Date();
  return room;
}

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

  // Handle origin validation for websocket connections to this service
  server.on(
    "upgrade",
    function (req: IncomingMessage, socket: Duplex, head: Buffer) {
      // Only handle realtime websockets - let other services handle their own paths
      if (req.url?.startsWith(path)) {
        // For on-premise deployments, ensure the websocket origin matches the deployed URL.
        // In cloud-hosted we support any origin for custom domains.
        if (
          !env.isCloudHosted &&
          (!req.headers.origin || !env.URL.startsWith(req.headers.origin))
        ) {
          socket.end(`HTTP/1.1 400 Bad Request\r\n`);
          return;
        }
        // Let Socket.io handle the upgrade for realtime path
        return;
      }

      // For collaboration, let it handle its own upgrades
      if (serviceNames.includes("collaboration") && req.url?.startsWith("/collaboration")) {
        return; // Let collaboration service handle its own upgrades
      }

      // If no service should handle this request, close the connection
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
      const collection = await Collection.findByPk(event.collectionId, {
        userId: user.id,
      });

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

  // Excalidraw collaboration event handlers

  // Join an Excalidraw room
  socket.on("join-excalidraw-room", async (event: { roomId: string; documentId: string }) => {
    try {
      const { roomId, documentId } = event;
      if (!roomId || !documentId) {
        socket.emit("excalidraw-error", { message: "Missing roomId or documentId" });
        return;
      }

      const { user } = socket.client;
      if (!user) {
        socket.emit("excalidraw-error", { message: "User not authenticated" });
        return;
      }

      Logger.debug("websockets", `Socket ${socket.id} (${user.name}) joining Excalidraw room ${roomId}`);

      const room = getOrCreateExcalidrawRoom(roomId, documentId);
      const isFirstInRoom = room.collaborators.size === 0;

      // Add user to room with user information
      const collaborator: ExcalidrawCollaborator = {
        socketId: socket.id,
        userId: user.id,
        name: user.name,
      };
      room.collaborators.set(socket.id, collaborator);
      await socket.join(`excalidraw-${roomId}`);

      // Notify user they joined the room
      socket.emit("excalidraw-joined-room", {
        roomId,
        documentId,
        collaborators: Array.from(room.collaborators.values()),
        isFirstInRoom,
      });

      if (isFirstInRoom) {
        socket.emit("excalidraw-first-in-room");
      } else {
        // Notify other users in the room about new user
        socket.to(`excalidraw-${roomId}`).emit("excalidraw-new-user", {
          socketId: socket.id,
          user: { id: user.id, name: user.name }
        });
      }

      // Send updated collaborators list to all room members
      socket.nsp.to(`excalidraw-${roomId}`).emit("excalidraw-room-user-change", {
        collaborators: Array.from(room.collaborators.values()),
      });

      Logger.info("websockets", `Socket ${socket.id} (${user.name}) joined Excalidraw room ${roomId}`, {
        collaborators: room.collaborators.size,
        isFirstInRoom,
      });

    } catch (error) {
      Logger.error("websockets", "Error joining Excalidraw room", error);
      socket.emit("excalidraw-error", { message: "Failed to join room" });
    }
  });

  // Leave an Excalidraw room
  socket.on("leave-excalidraw-room", async (event: { roomId: string }) => {
    try {
      const { roomId } = event;
      if (!roomId) return;

      Logger.debug("websockets", `Socket ${socket.id} leaving Excalidraw room ${roomId}`);

      const room = excalidrawRooms.get(roomId);
      if (room) {
        room.collaborators.delete(socket.id);
        await socket.leave(`excalidraw-${roomId}`);

        // Notify other users in the room
        socket.to(`excalidraw-${roomId}`).emit("excalidraw-user-left", { socketId: socket.id });

        // Send updated collaborators list to remaining room members
        socket.nsp.to(`excalidraw-${roomId}`).emit("excalidraw-room-user-change", {
          collaborators: Array.from(room.collaborators.values()),
        });

        // Clean up empty rooms
        if (room.collaborators.size === 0) {
          excalidrawRooms.delete(roomId);
          Logger.debug("websockets", `Cleaned up empty Excalidraw room ${roomId}`);
        }
      }

    } catch (error) {
      Logger.error("websockets", "Error leaving Excalidraw room", error);
    }
  });

  // Broadcast encrypted collaboration data
  socket.on("excalidraw-broadcast", async (event: {
    roomId: string;
    encryptedData: number[]; // Array format from client
    iv: number[]; // Array format from client
  }) => {
    try {
      const { roomId, encryptedData, iv } = event;
      if (!roomId) return;

      const room = excalidrawRooms.get(roomId);
      if (!room || !room.collaborators.has(socket.id)) {
        socket.emit("excalidraw-error", { message: "Not in room or room not found" });
        return;
      }

      room.lastActivity = new Date();

      // Broadcast to all other users in the room (keep array format for consistency)
      socket.to(`excalidraw-${roomId}`).emit("excalidraw-client-broadcast", {
        encryptedData,
        iv,
        socketId: socket.id,
      });

    } catch (error) {
      Logger.error("websockets", "Error broadcasting Excalidraw data", error);
    }
  });

  // Handle cursor/pointer updates
  socket.on("excalidraw-cursor", async (event: {
    roomId: string;
    pointer: { x: number; y: number };
    button: "down" | "up";
  }) => {
    try {
      const { roomId, pointer, button } = event;
      if (!roomId) return;

      const room = excalidrawRooms.get(roomId);
      if (!room || !room.collaborators.has(socket.id)) return;

      // Broadcast cursor update to other users in the room
      socket.to(`excalidraw-${roomId}`).emit("excalidraw-cursor-update", {
        socketId: socket.id,
        pointer,
        button,
      });

    } catch (error) {
      Logger.error("websockets", "Error handling cursor update", error);
    }
  });

  // Handle user idle status
  socket.on("excalidraw-idle-status", async (event: {
    roomId: string;
    userState: "active" | "idle";
  }) => {
    try {
      const { roomId, userState } = event;
      if (!roomId) return;

      const room = excalidrawRooms.get(roomId);
      if (!room || !room.collaborators.has(socket.id)) return;

      // Broadcast idle status to other users in the room
      socket.to(`excalidraw-${roomId}`).emit("excalidraw-idle-status-change", {
        socketId: socket.id,
        userState,
      });

    } catch (error) {
      Logger.error("websockets", "Error handling idle status", error);
    }
  });

  // Handle user following
  socket.on("excalidraw-follow", async (event: {
    roomId: string;
    followUserId?: string;
  }) => {
    try {
      const { roomId, followUserId } = event;
      if (!roomId) return;

      const room = excalidrawRooms.get(roomId);
      if (!room || !room.collaborators.has(socket.id)) return;

      // Broadcast follow event to room
      socket.nsp.to(`excalidraw-${roomId}`).emit("excalidraw-user-follow-change", {
        followerId: socket.id,
        followUserId,
      });

    } catch (error) {
      Logger.error("websockets", "Error handling follow event", error);
    }
  });

  // Handle disconnect - clean up Excalidraw rooms
  socket.on("disconnect", () => {
    // Clean up user from all Excalidraw rooms
    for (const [roomId, room] of excalidrawRooms.entries()) {
      if (room.collaborators.has(socket.id)) {
        room.collaborators.delete(socket.id);

        // Notify other users in the room
        socket.to(`excalidraw-${roomId}`).emit("excalidraw-user-left", { socketId: socket.id });

        // Send updated collaborators list
        socket.nsp.to(`excalidraw-${roomId}`).emit("excalidraw-room-user-change", {
          collaborators: Array.from(room.collaborators.values()),
        });

        // Clean up empty rooms
        if (room.collaborators.size === 0) {
          excalidrawRooms.delete(roomId);
          Logger.debug("websockets", `Cleaned up empty Excalidraw room ${roomId} after disconnect`);
        }
      }
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
