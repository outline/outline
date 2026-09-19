import { OutgoingMessage } from "@hocuspocus/server";
import type { beforeHandleMessagePayload } from "@hocuspocus/server";
import { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import { AuthorizationFailed } from "@shared/collaboration/CloseEvents";
import AwarenessIdentityExtension from "./AwarenessIdentityExtension";

describe("AwarenessIdentityExtension", () => {
  const extension = new AwarenessIdentityExtension();
  const documentName = "test";

  const encode = (clientId: number, state: Record<string, unknown> | null) => {
    const awareness = new Awareness(new Y.Doc());
    if (state !== null) {
      awareness.states.set(clientId, state);
    }
    awareness.meta.set(clientId, { clock: 1, lastUpdated: 0 });
    return new OutgoingMessage()
      .createAwarenessUpdateMessage(awareness, [clientId])
      .toUint8Array();
  };

  const buildPayload = (
    socketId: string,
    userId: string,
    update: Uint8Array,
    connections: Array<{ socketId: string; clients: number[] }>
  ) => {
    const document = {
      name: documentName,
      connections: new Map(
        connections.map((c) => [
          c.socketId,
          { clients: new Set(c.clients), connection: { socketId: c.socketId } },
        ])
      ),
    };

    return {
      document,
      documentName,
      socketId,
      context: { user: { id: userId } },
      update,
    } as unknown as beforeHandleMessagePayload;
  };

  it("should allow a state that matches the authenticated user", async () => {
    const payload = buildPayload(
      "a",
      "user-1",
      encode(1, { user: { id: "user-1" } }),
      [{ socketId: "a", clients: [1] }]
    );
    await expect(
      extension.beforeHandleMessage(payload)
    ).resolves.toBeUndefined();
  });

  it("should allow a new client id that nobody owns yet", async () => {
    const payload = buildPayload(
      "a",
      "user-1",
      encode(7, { user: { id: "user-1" } }),
      [
        { socketId: "a", clients: [] },
        { socketId: "b", clients: [2] },
      ]
    );
    await expect(
      extension.beforeHandleMessage(payload)
    ).resolves.toBeUndefined();
  });

  it("should reject a state claiming another user id", async () => {
    const payload = buildPayload(
      "a",
      "user-1",
      encode(1, { user: { id: "user-2" } }),
      [{ socketId: "a", clients: [1] }]
    );
    await expect(extension.beforeHandleMessage(payload)).rejects.toBe(
      AuthorizationFailed
    );
  });

  it("should reject an update for a client id owned by another connection", async () => {
    const payload = buildPayload(
      "a",
      "user-1",
      encode(2, { user: { id: "user-1" } }),
      [
        { socketId: "a", clients: [1] },
        { socketId: "b", clients: [2] },
      ]
    );
    await expect(extension.beforeHandleMessage(payload)).rejects.toBe(
      AuthorizationFailed
    );
  });

  it("should allow a removal of the connection's own client id", async () => {
    const payload = buildPayload("a", "user-1", encode(1, null), [
      { socketId: "a", clients: [1] },
      { socketId: "b", clients: [2] },
    ]);
    await expect(
      extension.beforeHandleMessage(payload)
    ).resolves.toBeUndefined();
  });

  it("should reject a removal of a client id owned by another connection", async () => {
    const payload = buildPayload("a", "user-1", encode(2, null), [
      { socketId: "a", clients: [1] },
      { socketId: "b", clients: [2] },
    ]);
    await expect(extension.beforeHandleMessage(payload)).rejects.toBe(
      AuthorizationFailed
    );
  });

  it("should ignore non-awareness messages", async () => {
    const payload = buildPayload("a", "user-1", new Uint8Array([0, 0]), [
      { socketId: "a", clients: [1] },
    ]);
    await expect(
      extension.beforeHandleMessage(payload)
    ).resolves.toBeUndefined();
  });
});
