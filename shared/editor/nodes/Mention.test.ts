import type { EditorState } from "prosemirror-state";
import { MentionType } from "../../types";
import { createEditorState, schema, serializer } from "../../test/editor";
import Mention from "./Mention";

const id = "0c440212-8b40-49fa-8a64-2548d6b60d59";
const modelId = "c85a0d80-3a89-4b25-a0cd-e7fc83f0d226";

const serializeMention = (
  attrs: Record<string, unknown>,
  options?: { commonMark?: boolean }
) => {
  const doc = schema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "mention", attrs: { id, modelId, ...attrs } }],
      },
    ],
  });
  return serializer.serialize(doc, options).trim();
};

describe("Mention serialization", () => {
  describe("markdown leaving Outline", () => {
    it("serializes an issue mention as an @ prefixed link to the external url", () => {
      expect(
        serializeMention(
          {
            type: MentionType.Issue,
            label: "Epic 1: Control plane Helm chart",
            href: "https://github.com/acme/infra/issues/2",
          },
          { commonMark: true }
        )
      ).toBe(
        "@[Epic 1: Control plane Helm chart](https://github.com/acme/infra/issues/2)"
      );
    });

    it("serializes a pull request mention as an @ prefixed link to the external url", () => {
      expect(
        serializeMention(
          {
            type: MentionType.PullRequest,
            label: "Add Helm chart",
            href: "https://github.com/acme/infra/pull/42",
          },
          { commonMark: true }
        )
      ).toBe("@[Add Helm chart](https://github.com/acme/infra/pull/42)");
    });

    it("serializes a project mention as an @ prefixed link to the external url", () => {
      expect(
        serializeMention(
          {
            type: MentionType.Project,
            label: "Q3 Roadmap",
            href: "https://github.com/orgs/acme/projects/7",
          },
          { commonMark: true }
        )
      ).toBe("@[Q3 Roadmap](https://github.com/orgs/acme/projects/7)");
    });

    it("serializes a url mention as an @ prefixed link", () => {
      expect(
        serializeMention(
          {
            type: MentionType.URL,
            label: "Example",
            href: "https://example.com/page",
          },
          { commonMark: true }
        )
      ).toBe("@[Example](https://example.com/page)");
    });

    it("sanitizes an unsafe url", () => {
      const markdown = serializeMention(
        {
          type: MentionType.Issue,
          label: "Epic 1",
          href: "javascript:alert(1)",
        },
        { commonMark: true }
      );
      expect(markdown).not.toContain("(javascript:");
    });

    it("keeps the mention:// format when there is no url to link to", () => {
      expect(
        serializeMention(
          { type: MentionType.Issue, label: "Epic 1" },
          { commonMark: true }
        )
      ).toBe(`@[Epic 1](mention://${id}/issue/${modelId})`);
    });

    it("keeps the mention:// format for internal mentions", () => {
      expect(
        serializeMention(
          { type: MentionType.User, label: "John Doe" },
          { commonMark: true }
        )
      ).toBe(`@[John Doe](mention://${id}/user/${modelId})`);
    });
  });

  describe("markdown staying within Outline", () => {
    it("keeps the mention:// format for an issue mention", () => {
      expect(
        serializeMention({
          type: MentionType.Issue,
          label: "Epic 1: Control plane Helm chart",
          href: "https://github.com/acme/infra/issues/2",
        })
      ).toBe(
        `@[Epic 1: Control plane Helm chart](mention://${id}/issue/${modelId})`
      );
    });

    it("keeps the mention:// format for a pull request mention", () => {
      expect(
        serializeMention({
          type: MentionType.PullRequest,
          label: "Add Helm chart",
          href: "https://github.com/acme/infra/pull/42",
        })
      ).toBe(`@[Add Helm chart](mention://${id}/pull_request/${modelId})`);
    });

    it("keeps the mention:// format for a project mention", () => {
      expect(
        serializeMention({
          type: MentionType.Project,
          label: "Q3 Roadmap",
          href: "https://github.com/orgs/acme/projects/7",
        })
      ).toBe(`@[Q3 Roadmap](mention://${id}/project/${modelId})`);
    });
  });

  describe("document and collection mentions", () => {
    it("serializes a document mention as an internal link", () => {
      expect(
        serializeMention(
          { type: MentionType.Document, label: "Onboarding" },
          { commonMark: true }
        )
      ).toBe(`[Onboarding](/doc/${modelId})`);
    });

    it("serializes a collection mention as an internal link", () => {
      expect(
        serializeMention(
          { type: MentionType.Collection, label: "Engineering" },
          { commonMark: true }
        )
      ).toBe(`[Engineering](/collection/${modelId})`);
    });
  });
});

describe("Mention ids", () => {
  const mention = (mentionId: string | null) =>
    schema.nodes.mention.create({
      id: mentionId,
      modelId,
      type: MentionType.User,
      label: "Name",
    });

  const ids = (state: EditorState) => {
    const result: string[] = [];
    state.doc.descendants((node) => {
      if (node.type.name === "mention") {
        result.push(node.attrs.id);
      }
    });
    return result;
  };

  it("gives a pasted duplicate a new id and keeps the original", () => {
    const state = createEditorState(
      schema.nodes.doc.create(null, [
        schema.nodes.paragraph.create(null, [mention(id)]),
        schema.nodes.paragraph.create(),
      ]),
      new Mention().plugins
    );

    const typed = state.apply(state.tr.insertText("x", 4));
    const pasted = typed.apply(typed.tr.insert(4, mention(id)));

    const [original, copy] = ids(pasted);
    expect(original).toBe(id);
    expect(copy).toEqual(expect.any(String));
    expect(copy).not.toBe(id);
  });

  it("keeps the original id when a duplicate is pasted as the first change", () => {
    const state = createEditorState(
      schema.nodes.doc.create(null, [
        schema.nodes.paragraph.create(null, [mention(id)]),
        schema.nodes.paragraph.create(),
      ]),
      new Mention().plugins
    );

    const pasted = state.apply(state.tr.insert(4, mention(id)));

    const [original, copy] = ids(pasted);
    expect(original).toBe(id);
    expect(copy).toEqual(expect.any(String));
    expect(copy).not.toBe(id);
  });

  it("gives the later of two loaded duplicates a new id", () => {
    const state = createEditorState(
      schema.nodes.doc.create(null, [
        schema.nodes.paragraph.create(null, [mention(id)]),
        schema.nodes.paragraph.create(null, [mention(id)]),
        schema.nodes.paragraph.create(),
      ]),
      new Mention().plugins
    );

    const newState = state.apply(state.tr.insertText("x", 7));

    const [first, second] = ids(newState);
    expect(first).toBe(id);
    expect(second).not.toBe(id);
  });

  it("assigns an id to a mention without one", () => {
    const state = createEditorState(
      schema.nodes.doc.create(null, [schema.nodes.paragraph.create()]),
      new Mention().plugins
    );

    const newState = state.apply(state.tr.insert(1, mention(null)));

    expect(ids(newState)[0]).toEqual(expect.any(String));
  });
});
