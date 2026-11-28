import { Node } from "prosemirror-model";
import { prosemirrorToYDoc } from "y-prosemirror";
import * as Y from "yjs";
import { schema } from "@server/editor";
import { createContext } from "@server/context";
import { Document, Event, Revision } from "@server/models";
import { sequelize } from "@server/storage/database";
import { buildDocument, buildUser } from "@server/test/factories";
import documentCollaborativeUpdater from "./documentCollaborativeUpdater";

describe("documentCollaborativeUpdater", () => {
  afterEach(() => vi.restoreAllMocks());

  const buildYDoc = (content: object[]) => {
    const doc = Node.fromJSON(schema, { type: "doc", content });
    return prosemirrorToYDoc(doc, "default");
  };

  it("persists canonical JSON without empty attrs on marks", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });

    const ydoc = buildYDoc([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Deciders:",
            marks: [{ type: "strong" }],
          },
        ],
      },
    ]);

    await documentCollaborativeUpdater({
      documentId: document.id,
      stateGeneration: 0,
      ydoc,
      collaborators: { ids: [user.id] },
      isLastConnection: true,
      clientVersion: null,
    });

    await document.reload();

    const marks = JSON.stringify(document.content).match(/"attrs":\{\}/g);
    expect(marks).toBeNull();

    const text = document.content?.content?.[0]?.content?.[0];
    expect(text?.marks).toEqual([{ type: "strong" }]);
  });

  it("updates collaborative fields and leaves other columns untouched", async () => {
    const user = await buildUser();
    const collaborator = await buildUser({ teamId: user.teamId });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      title: "Original title",
      text: "Original markdown",
      editorVersion: "1.0.0",
    });
    const { revisionCount } = document;

    const ydoc = buildYDoc([
      {
        type: "paragraph",
        content: [{ type: "text", text: "Updated" }],
      },
    ]);

    await documentCollaborativeUpdater({
      documentId: document.id,
      stateGeneration: 0,
      ydoc,
      collaborators: { ids: [collaborator.id] },
      isLastConnection: true,
      clientVersion: "2.0.0",
    });

    await document.reload();

    expect(document.title).toEqual("Original title");
    expect(document.text).toEqual("Original markdown");
    expect(document.editorVersion).toEqual("2.0.0");
    expect(document.lastModifiedById).toEqual(collaborator.id);
    expect(document.collaboratorIds).toEqual(
      expect.arrayContaining([user.id, collaborator.id])
    );
    expect(document.revisionCount).toEqual(revisionCount + 1);
    expect(document.content?.content?.[0]?.content?.[0]?.text).toEqual(
      "Updated"
    );
  });

  it("does not persist when content is unchanged", async () => {
    const user = await buildUser();
    const content = [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Hello" }],
      },
    ];
    const ydoc = buildYDoc(content);

    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      content: Node.fromJSON(schema, { type: "doc", content }).toJSON(),
    });

    const updatedAt = document.updatedAt;

    await documentCollaborativeUpdater({
      documentId: document.id,
      stateGeneration: 0,
      ydoc,
      collaborators: { ids: [user.id] },
      isLastConnection: true,
      clientVersion: null,
    });

    await document.reload();
    expect(document.updatedAt).toEqual(updatedAt);
  });

  it.each(["single", "multiple"])(
    "uses the last collaborator for attribution with %s collaborators",
    async (scenario) => {
      const userA = await buildUser();
      const userB = await buildUser({ teamId: userA.teamId });
      const document = await buildDocument({
        teamId: userA.teamId,
        userId: userA.id,
      });
      await Revision.createFromDocument(
        createContext({ user: userA }),
        document
      );
      const ydoc = buildYDoc([
        { type: "paragraph", content: [{ type: "text", text: "B's edit" }] },
      ]);

      await documentCollaborativeUpdater({
        documentId: document.id,
        stateGeneration: 0,
        ydoc,
        collaborators: {
          ids: scenario === "single" ? [userB.id] : [userA.id, userB.id],
        },
        isLastConnection: true,
        clientVersion: null,
      });
      await document.reload();
      const revision = await Revision.createFromDocument(
        createContext({ user: userA }),
        document
      );

      expect(document.lastModifiedById).toBe(userB.id);
      expect(document.collaboratorIds).toContain(userB.id);
      expect(revision.userId).toBe(userB.id);
      expect(revision.content?.content?.[0]?.content?.[0]?.text).toBe(
        "B's edit"
      );
      ydoc.destroy();
    }
  );

  it("schedules revision processing after the snapshot has committed", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    const ydoc = buildYDoc([
      {
        type: "paragraph",
        content: [{ type: "text", text: "Committed edit" }],
      },
    ]);
    const schedule = Event.schedule.bind(Event);
    const scheduled = vi
      .spyOn(Event, "schedule")
      .mockImplementationOnce(async (event) => {
        const saved = await Document.findByPk(document.id, {
          rejectOnEmpty: true,
        });
        expect(saved.content?.content?.[0]?.content?.[0]?.text).toBe(
          "Committed edit"
        );
        expect(event.data?.collaborators).toBe(42);
        return schedule(event);
      });

    await documentCollaborativeUpdater({
      documentId: document.id,
      stateGeneration: 0,
      ydoc,
      collaborators: { ids: [user.id], sequence: 42 },
      isLastConnection: true,
      clientVersion: null,
    });
    expect(scheduled).toHaveBeenCalledOnce();
    ydoc.destroy();
  });

  it("keeps the committed snapshot when scheduling the event fails", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    const ydoc = buildYDoc([
      { type: "paragraph", content: [{ type: "text", text: "Kept edit" }] },
    ]);
    vi.spyOn(Event, "schedule").mockRejectedValueOnce(
      new Error("Queue unavailable")
    );

    await expect(
      documentCollaborativeUpdater({
        documentId: document.id,
        stateGeneration: 0,
        ydoc,
        collaborators: { ids: [user.id] },
        isLastConnection: true,
        clientVersion: null,
      })
    ).resolves.toEqual({ reset: false });

    await document.reload();
    expect(document.content?.content?.[0]?.content?.[0]?.text).toBe(
      "Kept edit"
    );
    ydoc.destroy();
  });

  it("does not wait for a concurrent foreign key insert on the document", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    const ydoc = buildYDoc([
      {
        type: "paragraph",
        content: [{ type: "text", text: "Saved while referenced" }],
      },
    ]);

    // A foreign key check on insert takes FOR KEY SHARE on the parent row.
    const other = await sequelize.transaction();
    try {
      await sequelize.query(
        `SELECT id FROM documents WHERE id = :id FOR KEY SHARE`,
        { replacements: { id: document.id }, transaction: other }
      );

      const save = documentCollaborativeUpdater({
        documentId: document.id,
        stateGeneration: 0,
        ydoc,
        collaborators: { ids: [user.id] },
        isLastConnection: true,
        clientVersion: null,
      }).then(() => "saved");
      const timeout = new Promise((resolve) =>
        setTimeout(() => resolve("blocked"), 2000)
      );

      await expect(Promise.race([save, timeout])).resolves.toBe("saved");
    } finally {
      await other.rollback();
    }

    await document.reload();
    expect(document.content?.content?.[0]?.content?.[0]?.text).toBe(
      "Saved while referenced"
    );
    ydoc.destroy();
  });

  describe("state generation", () => {
    const text = (ydoc: Y.Doc) => {
      const paragraph = ydoc
        .get("default", Y.XmlFragment)
        .get(0) as Y.XmlElement;
      return paragraph.get(0) as Y.XmlText;
    };

    /**
     * Build a ydoc whose state has the given length of deleted history.
     * Without garbage collection, deleted text stays in the state.
     */
    const buildHistory = (length: number) => {
      const ydoc = new Y.Doc({ gc: false });
      Y.applyUpdate(
        ydoc,
        Y.encodeStateAsUpdate(
          buildYDoc([
            { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
          ])
        )
      );
      text(ydoc).insert(5, "x".repeat(length));
      text(ydoc).delete(5, length);
      return ydoc;
    };

    it("replaces state that is over the maximum length", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        teamId: user.teamId,
        userId: user.id,
      });
      const ydoc = buildHistory(1_600_000);

      const result = await documentCollaborativeUpdater({
        documentId: document.id,
        stateGeneration: 0,
        ydoc,
        collaborators: { ids: [user.id] },
        isLastConnection: true,
        clientVersion: null,
      });

      expect(result).toEqual({ reset: true });
      const reloaded = await Document.unscoped().findByPk(document.id, {
        attributes: ["state", "stateGeneration", "content"],
        rejectOnEmpty: true,
      });
      expect(reloaded.stateGeneration).toBe(1);
      expect(reloaded.state?.length).toBeLessThan(1000);
      expect(reloaded.content?.content?.[0]?.content?.[0]?.text).toBe("Hello");

      const flattened = new Y.Doc();
      Y.applyUpdate(flattened, reloaded.state ?? new Uint8Array());
      expect(text(flattened).toString()).toBe("Hello");
      flattened.destroy();
      ydoc.destroy();
    });

    it("keeps large state that is under the maximum length", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        teamId: user.teamId,
        userId: user.id,
      });
      const ydoc = buildHistory(1_100_000);

      const result = await documentCollaborativeUpdater({
        documentId: document.id,
        stateGeneration: 0,
        ydoc,
        collaborators: { ids: [user.id] },
        isLastConnection: true,
        clientVersion: null,
      });

      expect(result).toEqual({ reset: false });
      const reloaded = await Document.unscoped().findByPk(document.id, {
        attributes: ["state", "stateGeneration"],
        rejectOnEmpty: true,
      });
      expect(reloaded.stateGeneration).toBe(0);
      expect(reloaded.state?.length).toBeGreaterThan(1_000_000);
      ydoc.destroy();
    });

    it("does not persist state of an earlier generation", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        teamId: user.teamId,
        userId: user.id,
      });
      await document.update({ stateGeneration: 1 });
      const content = document.content;
      const ydoc = buildYDoc([
        { type: "paragraph", content: [{ type: "text", text: "Stale edit" }] },
      ]);

      const result = await documentCollaborativeUpdater({
        documentId: document.id,
        stateGeneration: 0,
        ydoc,
        collaborators: { ids: [user.id] },
        isLastConnection: true,
        clientVersion: null,
      });

      expect(result).toEqual({ reset: true });
      await document.reload();
      expect(document.content).toEqual(content);
      expect(document.stateGeneration).toBe(1);
      ydoc.destroy();
    });
  });
});
