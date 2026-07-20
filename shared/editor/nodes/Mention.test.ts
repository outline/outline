import { extensionManager, schema } from "../../test/editor";

const serializer = extensionManager.serializer();

function serializeMention(attrs: Record<string, unknown>) {
  const doc = schema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "mention", attrs }],
      },
    ],
  });
  return serializer.serialize(doc, { commonMark: true }).trim();
}

describe("Mention serialization", () => {
  const id = "0c440212-8b40-49fa-8a64-2548d6b60d59";
  const modelId = "c85a0d80-3a89-4b25-a0cd-e7fc83f0d226";

  describe("external integration mentions", () => {
    it("serializes an issue mention with an href to a plain link", () => {
      expect(
        serializeMention({
          type: "issue",
          label: "Epic 1: Control plane Helm chart",
          modelId,
          id,
          href: "https://github.com/acme/infra/issues/2",
        })
      ).toBe(
        "[Epic 1: Control plane Helm chart](https://github.com/acme/infra/issues/2)"
      );
    });

    it("serializes a pull request mention with an href to a plain link", () => {
      expect(
        serializeMention({
          type: "pull_request",
          label: "Add Helm chart",
          modelId,
          id,
          href: "https://github.com/acme/infra/pull/42",
        })
      ).toBe("[Add Helm chart](https://github.com/acme/infra/pull/42)");
    });

    it("serializes a project mention with an href to a plain link", () => {
      expect(
        serializeMention({
          type: "project",
          label: "Q3 Roadmap",
          modelId,
          id,
          href: "https://github.com/orgs/acme/projects/7",
        })
      ).toBe("[Q3 Roadmap](https://github.com/orgs/acme/projects/7)");
    });

    it("falls back to mention:// when an issue mention has no href", () => {
      expect(
        serializeMention({
          type: "issue",
          label: "Epic 1",
          modelId,
          id,
        })
      ).toBe(`@[Epic 1](mention://${id}/issue/${modelId})`);
    });
  });

  describe("other mention types are unchanged", () => {
    it("keeps the mention:// format for user mentions", () => {
      expect(
        serializeMention({
          type: "user",
          label: "John Doe",
          modelId,
          id,
        })
      ).toBe(`@[John Doe](mention://${id}/user/${modelId})`);
    });

    it("keeps the mention:// format for group mentions", () => {
      expect(
        serializeMention({
          type: "group",
          label: "Engineering",
          modelId,
          id,
        })
      ).toBe(`@[Engineering](mention://${id}/group/${modelId})`);
    });

    it("keeps the mention:// format for date mentions", () => {
      expect(
        serializeMention({
          type: "date",
          label: "February 3rd, 2024",
          modelId: "2024-02-03",
          id,
        })
      ).toBe(`@[February 3rd, 2024](mention://${id}/date/2024-02-03)`);
    });

    it("keeps the mention:// format for url mentions even with an href", () => {
      expect(
        serializeMention({
          type: "url",
          label: "Example",
          modelId,
          id,
          href: "https://example.com",
        })
      ).toBe(`@[Example](mention://${id}/url/${modelId})`);
    });
  });
});
