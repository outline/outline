import { Node } from "prosemirror-model";
import { prosemirrorToYDoc } from "y-prosemirror";
import * as Y from "yjs";
import { APIUpdateExtension } from "@server/collaboration/APIUpdateExtension";
import { collaborationSessionKey } from "@server/collaboration/sessions";
import { schema } from "@server/editor";
import { Document } from "@server/models";
import RedisAdapter from "@server/storage/redis";
import { buildDocument } from "@server/test/factories";
import documentStateFlattener from "./documentStateFlattener";

describe("documentStateFlattener", () => {
  afterEach(() => vi.restoreAllMocks());

  /**
   * Build state with the given text and length of deleted history. Without
   * garbage collection, deleted text stays in the state.
   */
  const buildState = (value: string, history: number) => {
    const ydoc = new Y.Doc({ gc: false });
    const doc = Node.fromJSON(schema, {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: value }] },
      ],
    });
    Y.applyUpdate(
      ydoc,
      Y.encodeStateAsUpdate(prosemirrorToYDoc(doc, "default"))
    );
    const paragraph = ydoc.get("default", Y.XmlFragment).get(0) as Y.XmlElement;
    const text = paragraph.get(0) as Y.XmlText;
    text.insert(value.length, "x".repeat(history));
    text.delete(value.length, history);
    const state = Buffer.from(Y.encodeStateAsUpdate(ydoc));
    ydoc.destroy();
    return state;
  };

  const setState = async (document: Document, state: Buffer) => {
    await Document.unscoped().update(
      { state },
      { where: { id: document.id }, hooks: false, silent: true }
    );
  };

  const reload = (document: Document) =>
    Document.unscoped().findByPk(document.id, {
      attributes: ["state", "stateGeneration"],
      rejectOnEmpty: true,
    });

  it("replaces large state that is mostly history", async () => {
    const notify = vi
      .spyOn(APIUpdateExtension, "notifyUpdate")
      .mockResolvedValue();
    const document = await buildDocument();
    await setState(document, buildState("Hello", 1_100_000));

    const result = await documentStateFlattener({
      documentId: document.id,
      actorId: document.createdById,
      since: new Date(),
    });

    expect(result).toBe(true);
    const reloaded = await reload(document);
    expect(reloaded.stateGeneration).toBe(1);
    expect(reloaded.state?.length).toBeLessThan(1000);

    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, reloaded.state ?? new Uint8Array());
    expect(ydoc.get("default", Y.XmlFragment).toString()).toContain("Hello");
    ydoc.destroy();
    expect(notify).toHaveBeenCalledWith(document.id, document.createdById);
  });

  it("does not replace state of a document updated after the given time", async () => {
    const notify = vi.spyOn(APIUpdateExtension, "notifyUpdate");
    const document = await buildDocument();
    await setState(document, buildState("Hello", 1_100_000));

    const result = await documentStateFlattener({
      documentId: document.id,
      actorId: document.createdById,
      since: new Date(document.updatedAt.getTime() - 1000),
    });

    expect(result).toBe(false);
    expect((await reload(document)).stateGeneration).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("does not replace state while a collaboration session is open", async () => {
    const document = await buildDocument();
    await setState(document, buildState("Hello", 1_100_000));
    await RedisAdapter.collaborationClient.zadd(
      collaborationSessionKey(document.id),
      Date.now() + 60_000,
      "instance"
    );

    const result = await documentStateFlattener({
      documentId: document.id,
      actorId: document.createdById,
      since: new Date(),
    });

    expect(result).toBe(false);
    expect((await reload(document)).stateGeneration).toBe(0);
  });

  it("replaces state when the only session record has expired", async () => {
    vi.spyOn(APIUpdateExtension, "notifyUpdate").mockResolvedValue();
    const document = await buildDocument();
    await setState(document, buildState("Hello", 1_100_000));
    await RedisAdapter.collaborationClient.zadd(
      collaborationSessionKey(document.id),
      Date.now() - 1000,
      "instance"
    );

    const result = await documentStateFlattener({
      documentId: document.id,
      actorId: document.createdById,
      since: new Date(),
    });

    expect(result).toBe(true);
  });

  it("does not replace large state that is mostly content", async () => {
    const document = await buildDocument();
    await setState(document, buildState("y".repeat(1_100_000), 0));

    const result = await documentStateFlattener({
      documentId: document.id,
      actorId: document.createdById,
      since: new Date(),
    });

    expect(result).toBe(false);
    expect((await reload(document)).stateGeneration).toBe(0);
  });

  it("does not replace small state", async () => {
    const document = await buildDocument();
    await setState(document, buildState("Hello", 10));

    const result = await documentStateFlattener({
      documentId: document.id,
      actorId: document.createdById,
      since: new Date(),
    });

    expect(result).toBe(false);
  });
});
