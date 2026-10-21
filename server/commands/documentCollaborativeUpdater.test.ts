import { Node } from "prosemirror-model";
import { prosemirrorToYDoc } from "y-prosemirror";
import { schema } from "@server/editor";
import { createContext } from "@server/context";
import { Document, Event, Revision } from "@server/models";
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
        ydoc,
        collaborators: { ids: [user.id] },
        isLastConnection: true,
        clientVersion: null,
      })
    ).resolves.toBeUndefined();

    await document.reload();
    expect(document.content?.content?.[0]?.content?.[0]?.text).toBe(
      "Kept edit"
    );
    ydoc.destroy();
  });
});
