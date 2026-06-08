import { Node } from "prosemirror-model";
import { prosemirrorToYDoc } from "y-prosemirror";
import { schema } from "@server/editor";
import { buildDocument, buildUser } from "@server/test/factories";
import documentCollaborativeUpdater from "./documentCollaborativeUpdater";

describe("documentCollaborativeUpdater", () => {
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
      sessionCollaboratorIds: [user.id],
      isLastConnection: true,
      clientVersion: null,
    });

    await document.reload();

    const marks = JSON.stringify(document.content).match(/"attrs":\{\}/g);
    expect(marks).toBeNull();

    const text = document.content?.content?.[0]?.content?.[0];
    expect(text?.marks).toEqual([{ type: "strong" }]);
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
      sessionCollaboratorIds: [user.id],
      isLastConnection: true,
      clientVersion: null,
    });

    await document.reload();
    expect(document.updatedAt).toEqual(updatedAt);
  });
});
