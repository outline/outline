import type {
  Hocuspocus,
  connectedPayload,
  onConfigurePayload,
  onDisconnectPayload,
} from "@hocuspocus/server";
import { randomUUID } from "node:crypto";
import { buildDocumentName } from "@shared/collaboration/documentName";
import FlattenDocumentStateTask from "@server/queues/tasks/FlattenDocumentStateTask";
import { SessionExtension } from "./SessionExtension";
import { collaborationSessionExists } from "./sessions";

describe("SessionExtension", () => {
  afterEach(() => vi.restoreAllMocks());

  /** Build an extension with the given rooms loaded, as name to connection count. */
  const setup = async (rooms: Record<string, number> = {}) => {
    const extension = new SessionExtension();
    const documents = new Map(
      Object.entries(rooms).map(([name, count]) => [
        name,
        { getConnectionsCount: () => count },
      ])
    );
    await extension.onConfigure({
      instance: { documents } as unknown as Hocuspocus,
    } as onConfigurePayload);
    return extension;
  };

  const connect = (extension: SessionExtension, documentName: string) =>
    extension.connected({ documentName } as connectedPayload);

  const disconnect = (extension: SessionExtension, documentName: string) =>
    extension.onDisconnect({
      documentName,
      clientsCount: 0,
      context: { user: { id: randomUUID() } },
    } as unknown as onDisconnectPayload & { context: object });

  it("records a session while a connection is open", async () => {
    const schedule = vi
      .spyOn(FlattenDocumentStateTask.prototype, "scheduleOptional")
      .mockResolvedValue(undefined);
    const documentId = randomUUID();
    const name = buildDocumentName(documentId, 0);
    const extension = await setup();

    expect(await collaborationSessionExists(documentId)).toBe(false);
    await connect(extension, name);
    expect(await collaborationSessionExists(documentId)).toBe(true);

    await disconnect(extension, name);
    expect(await collaborationSessionExists(documentId)).toBe(false);
    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({ documentId }),
      expect.anything()
    );
    await extension.onDestroy();
  });

  it("keeps the session while a room of another generation is open", async () => {
    vi.spyOn(
      FlattenDocumentStateTask.prototype,
      "scheduleOptional"
    ).mockResolvedValue(undefined);
    const documentId = randomUUID();
    const oldName = buildDocumentName(documentId, 0);
    const newName = buildDocumentName(documentId, 1);
    const extension = await setup({ [oldName]: 0, [newName]: 1 });

    await connect(extension, newName);
    await disconnect(extension, oldName);
    expect(await collaborationSessionExists(documentId)).toBe(true);
    await extension.onDestroy();
  });

  it("keeps the session of another instance", async () => {
    vi.spyOn(
      FlattenDocumentStateTask.prototype,
      "scheduleOptional"
    ).mockResolvedValue(undefined);
    const documentId = randomUUID();
    const name = buildDocumentName(documentId, 0);
    const first = await setup();
    const second = await setup();

    await connect(first, name);
    await connect(second, name);
    await disconnect(first, name);
    expect(await collaborationSessionExists(documentId)).toBe(true);
    await first.onDestroy();
    await second.onDestroy();
  });
});
