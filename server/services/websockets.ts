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
  excalidrawDataId: string;
  collaborators: Map<string, ExcalidrawCollaborator>; // socket ID -> collaborator info
  createdAt: Date;
  lastActivity: Date;
  lastSaved: Date;
  pendingSave: boolean;
}

// Global state for Excalidraw rooms
const excalidrawRooms = new Map<string, ExcalidrawRoom>();

// Helper function to get or create an Excalidraw room
function getOrCreateExcalidrawRoom(roomId: string, documentId: string, excalidrawDataId: string): ExcalidrawRoom {
  let room = excalidrawRooms.get(roomId);
  if (!room) {
    const now = new Date();
    room = {
      roomId,
      documentId,
      excalidrawDataId,
      collaborators: new Map(),
      createdAt: now,
      lastActivity: now,
      lastSaved: now,
      pendingSave: false,
    };
    excalidrawRooms.set(roomId, room);
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

  // Periodic cleanup of inactive Excalidraw rooms to prevent memory leaks
  const ROOM_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  const ROOM_INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour

  const roomCleanupInterval = setInterval(() => {
    const now = Date.now();

    for (const [roomId, room] of excalidrawRooms.entries()) {
      const inactiveTime = now - room.lastActivity.getTime();

      // Clean up rooms that have been inactive for more than 1 hour
      if (inactiveTime > ROOM_INACTIVITY_TIMEOUT) {
        excalidrawRooms.delete(roomId);
      }
    }
  }, ROOM_CLEANUP_INTERVAL);

  // Clean up interval on shutdown
  ShutdownHelper.add("excalidraw-rooms", ShutdownOrder.normal, async () => {
    clearInterval(roomCleanupInterval);
    excalidrawRooms.clear();
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

      await authenticated(io, socket);
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
  socket.on("join-excalidraw-room", async (event: { roomId: string; documentId: string; excalidrawDataId: string }) => {
    try {
      const { roomId, documentId, excalidrawDataId } = event;
      if (!roomId || !documentId || !excalidrawDataId) {
        socket.emit("excalidraw-error", { message: "Missing roomId, documentId, or excalidrawDataId" });
        return;
      }

      const { user } = socket.client;
      if (!user) {
        socket.emit("excalidraw-error", { message: "User not authenticated" });
        return;
      }

      // Validate all IDs are valid UUIDs (roomId is now just the diagram UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(roomId)) {
        Logger.debug("websockets", `Invalid roomId format: ${roomId}`);
        socket.emit("excalidraw-error", { message: "Invalid roomId format" });
        return;
      }

      if (!uuidRegex.test(documentId)) {
        Logger.debug("websockets", `Invalid documentId format: ${documentId}`);
        socket.emit("excalidraw-error", { message: "Invalid documentId format" });
        return;
      }

      // Validate excalidrawDataId is a valid UUID (should match roomId now)
      if (!uuidRegex.test(excalidrawDataId)) {
        Logger.debug("websockets", `Invalid excalidrawDataId format: ${excalidrawDataId}`);
        socket.emit("excalidraw-error", { message: "Invalid excalidrawDataId format" });
        return;
      }

      // Get or create collaboration room
      const room = getOrCreateExcalidrawRoom(roomId, documentId, excalidrawDataId);
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

    } catch (error) {
      Logger.error("Error joining Excalidraw room", error);
      socket.emit("excalidraw-error", { message: "Failed to join room" });
    }
  });

  // Leave an Excalidraw room
  socket.on("leave-excalidraw-room", async (event: { roomId: string }) => {
    try {
      const { roomId } = event;
      if (!roomId) {
        return;
      }

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
        }
      }

    } catch (error) {
      Logger.error("Error leaving Excalidraw room", error);
    }
  });

  // Broadcast collaboration data (plain JSON over WSS)
  socket.on("excalidraw-broadcast", (event: {
    roomId: string;
    payload: unknown;
  }) => {
    try {
      const { roomId, payload } = event;
      if (!roomId) {
        return;
      }

      const room = excalidrawRooms.get(roomId);
      if (!room || !room.collaborators.has(socket.id)) {
        socket.emit("excalidraw-error", { message: "Not in room or room not found" });
        return;
      }

      room.lastActivity = new Date();

      // Broadcast to all other users in the room
      socket.to(`excalidraw-${roomId}`).emit("excalidraw-client-broadcast", {
        payload,
        socketId: socket.id,
      });

    } catch (error) {
      Logger.error("Error broadcasting Excalidraw data", error);
    }
  });

  // Note: Scene data is now saved directly to node attributes via ProseMirror transactions on the client
  // No server-side save handler needed

  // Note: Cursor updates now use encrypted broadcast channel (excalidraw-broadcast)
  // instead of separate excalidraw-cursor events

  // Handle user idle status
  socket.on("excalidraw-idle-status", async (event: {
    roomId: string;
    userState: "active" | "idle";
  }) => {
    try {
      const { roomId, userState } = event;
      if (!roomId) {
        return;
      }

      const room = excalidrawRooms.get(roomId);
      if (!room || !room.collaborators.has(socket.id)) {
        return;
      }

      // Broadcast idle status to other users in the room
      socket.to(`excalidraw-${roomId}`).emit("excalidraw-idle-status-change", {
        socketId: socket.id,
        userState,
      });

    } catch (error) {
      Logger.error("Error handling idle status", error);
    }
  });

  // Handle user following
  socket.on("excalidraw-follow", async (event: {
    roomId: string;
    followUserId?: string;
  }) => {
    try {
      const { roomId, followUserId } = event;
      if (!roomId) {
        return;
      }

      const room = excalidrawRooms.get(roomId);
      if (!room || !room.collaborators.has(socket.id)) {
        return;
      }

      // Broadcast follow event to room
      socket.nsp.to(`excalidraw-${roomId}`).emit("excalidraw-user-follow-change", {
        followerId: socket.id,
        followUserId,
      });

    } catch (error) {
      Logger.error("Error handling follow event", error);
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
        }
      }
    }
  });

  // join all of the rooms at once
  await socket.join(rooms);

  // Emit authenticated event AFTER all event listeners are registered AND rooms are joined
  // This prevents race conditions where client emits events before setup is complete
  socket.emit("authenticated", true);
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
