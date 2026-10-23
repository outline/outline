import { Scope } from "@shared/types";
import { createContext } from "@server/context";
import { Revision } from "@server/models";
import type { Document, User } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import {
  buildCollection,
  buildDocument,
  buildOAuthAuthentication,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import {
  buildOAuthUser,
  callMcpTool,
  mcpHeaders,
  mcpRequest,
  parseMcpResponse,
} from "@server/test/McpHelper";

const server = getTestServer();

/**
 * Applies markdown to a document as the given user and saves a revision.
 *
 * @param document - the document to edit.
 * @param user - the user making the edit.
 * @param text - the new markdown content.
 * @returns the created revision.
 */
async function edit(document: Document, user: User, text: string) {
  DocumentHelper.applyMarkdownToDocument(document, text);
  document.lastModifiedById = user.id;
  await document.save();
  return Revision.createFromDocument(createContext({ user }), document);
}

async function setup() {
  const { user, accessToken } = await buildOAuthUser();
  const collection = await buildCollection({
    teamId: user.teamId,
    userId: user.id,
  });
  const document = await buildDocument({
    teamId: user.teamId,
    userId: user.id,
    collectionId: collection.id,
  });
  return { user, accessToken, document };
}

function parse(res: Awaited<ReturnType<typeof callMcpTool>>) {
  const content = res?.result?.content ?? [];
  return {
    meta: JSON.parse(content[0]?.text ?? "{}"),
    diff: content[1]?.text ?? "",
  };
}

describe("get_document_changes", () => {
  it("returns a markdown diff from a revision to the current document", async () => {
    const { user, accessToken, document } = await setup();
    const other = await buildUser({ teamId: user.teamId });
    const first = await edit(document, user, "First line\n\nSecond line");
    const second = await edit(document, other, "First line\n\nChanged line");

    const res = await callMcpTool(server, accessToken, "get_document_changes", {
      id: document.id,
      from: first.id,
    });
    const { meta, diff } = parse(res);

    expect(res?.result?.isError).not.toBe(true);
    expect(diff).toContain("-Second line");
    expect(diff).toContain("+Changed line");
    expect(diff).toContain(" First line");
    expect(meta.from.revisionId).toEqual(first.id);
    expect(meta.to.current).toBe(true);
    expect(meta.to.unsavedEditsBy).toBeUndefined();
    expect(meta.hasChanges).toBe(true);
    expect(meta.revisions).toHaveLength(1);
    expect(meta.revisions[0].id).toEqual(second.id);
    expect(meta.revisions[0].author).toEqual({
      id: other.id,
      name: other.name,
    });
  });

  it("reports edits that are not yet saved as a revision", async () => {
    const { user, accessToken, document } = await setup();
    const first = await edit(document, user, "Original");
    DocumentHelper.applyMarkdownToDocument(document, "Unsaved");
    await document.save();

    const res = await callMcpTool(server, accessToken, "get_document_changes", {
      id: document.id,
      from: first.id,
    });
    const { meta, diff } = parse(res);

    expect(diff).toContain("-Original");
    expect(diff).toContain("+Unsaved");
    expect(meta.revisions).toHaveLength(0);
    expect(meta.to.unsavedEditsBy.id).toEqual(document.lastModifiedById);
  });

  it("compares two revisions", async () => {
    const { user, accessToken, document } = await setup();
    const first = await edit(document, user, "One");
    const second = await edit(document, user, "Two");
    await edit(document, user, "Three");

    const res = await callMcpTool(server, accessToken, "get_document_changes", {
      id: document.id,
      from: first.id,
      to: second.id,
    });
    const { meta, diff } = parse(res);

    expect(diff).toContain("-One");
    expect(diff).toContain("+Two");
    expect(diff).not.toContain("Three");
    expect(meta.to.revisionId).toEqual(second.id);
    expect(meta.revisions.map((r: { id: string }) => r.id)).toEqual([
      second.id,
    ]);
  });

  it("starts from the latest revision by the current user", async () => {
    const { user, accessToken, document } = await setup();
    const other = await buildUser({ teamId: user.teamId });
    await edit(document, user, "Mine");
    const theirs = await edit(document, other, "Theirs");

    const res = await callMcpTool(server, accessToken, "get_document_changes", {
      id: document.id,
      from: "my_last_edit",
    });
    const { meta, diff } = parse(res);

    expect(diff).toContain("-Mine");
    expect(diff).toContain("+Theirs");
    expect(meta.revisions.map((r: { id: string }) => r.id)).toEqual([
      theirs.id,
    ]);
  });

  it("starts from a revision the current user collaborated on", async () => {
    const { user, accessToken, document } = await setup();
    const other = await buildUser({ teamId: user.teamId });
    DocumentHelper.applyMarkdownToDocument(document, "Shared");
    document.lastModifiedById = other.id;
    await document.save();
    const shared = await Revision.createFromDocument(
      createContext({ user: other }),
      document,
      [other.id, user.id]
    );
    await edit(document, other, "Later");

    const res = await callMcpTool(server, accessToken, "get_document_changes", {
      id: document.id,
      from: "my_last_edit",
    });
    const { meta, diff } = parse(res);

    expect(meta.from.revisionId).toEqual(shared.id);
    expect(diff).toContain("+Later");
  });

  it("starts from the current document when the current user edited it last", async () => {
    const { user, accessToken, document } = await setup();
    await edit(document, user, "Saved");
    DocumentHelper.applyMarkdownToDocument(document, "Unsaved");
    document.lastModifiedById = user.id;
    await document.save();

    const res = await callMcpTool(server, accessToken, "get_document_changes", {
      id: document.id,
      from: "my_last_edit",
    });
    const { meta, diff } = parse(res);

    expect(meta.from.revisionId).toBeNull();
    expect(meta.from.current).toBe(true);
    expect(meta.hasChanges).toBe(false);
    expect(meta.revisions).toHaveLength(0);
    expect(diff).toEqual("No changes to the document content.");
  });

  it("starts from a revision when the range ends at a revision", async () => {
    const { user, accessToken, document } = await setup();
    const other = await buildUser({ teamId: user.teamId });
    const mine = await edit(document, user, "Mine");
    const theirs = await edit(document, other, "Theirs");
    DocumentHelper.applyMarkdownToDocument(document, "Unsaved");
    document.lastModifiedById = user.id;
    await document.save();

    const res = await callMcpTool(server, accessToken, "get_document_changes", {
      id: document.id,
      from: "my_last_edit",
      to: theirs.id,
    });
    const { meta, diff } = parse(res);

    expect(meta.from.revisionId).toEqual(mine.id);
    expect(diff).toContain("-Mine");
    expect(diff).toContain("+Theirs");
  });

  it("starts from the document at a timestamp", async () => {
    const { user, accessToken, document } = await setup();
    DocumentHelper.applyMarkdownToDocument(document, "Before");
    await document.save();
    const first = Revision.buildFromDocument(document);
    first.createdAt = new Date("2026-01-01T00:00:00Z");
    await first.save();
    const second = await edit(document, user, "After");

    const res = await callMcpTool(server, accessToken, "get_document_changes", {
      id: document.id,
      from: "2026-01-02T00:00:00Z",
    });
    const { meta, diff } = parse(res);

    expect(meta.from.revisionId).toEqual(first.id);
    expect(diff).toContain("-Before");
    expect(diff).toContain("+After");
    expect(meta.revisions.map((r: { id: string }) => r.id)).toEqual([
      second.id,
    ]);
  });

  it("treats the document as empty before its first revision", async () => {
    const { user, accessToken, document } = await setup();
    await edit(document, user, "Content");

    const res = await callMcpTool(server, accessToken, "get_document_changes", {
      id: document.id,
      from: "2000-01-01T00:00:00Z",
    });
    const { meta, diff } = parse(res);

    expect(meta.from.revisionId).toBeNull();
    expect(diff).toContain("+Content");
    expect(meta.title.before).toBeNull();
  });

  it("starts from the current document for a time after the latest edit", async () => {
    const { user, accessToken, document } = await setup();
    await edit(document, user, "Saved");
    DocumentHelper.applyMarkdownToDocument(document, "Unsaved");
    await document.save();

    const res = await callMcpTool(server, accessToken, "get_document_changes", {
      id: document.id,
      from: new Date(document.updatedAt.getTime() + 1000).toISOString(),
    });
    const { meta, diff } = parse(res);

    expect(meta.from.current).toBe(true);
    expect(meta.hasChanges).toBe(false);
    expect(diff).toEqual("No changes to the document content.");
  });

  it("does not list revisions newer than the loaded document", async () => {
    const { user, accessToken, document } = await setup();
    const first = await edit(document, user, "Saved");
    const future = Revision.buildFromDocument(document);
    future.createdAt = new Date(document.updatedAt.getTime() + 60_000);
    await future.save();

    const res = await callMcpTool(server, accessToken, "get_document_changes", {
      id: document.id,
      from: first.id,
    });
    const { meta } = parse(res);

    expect(meta.revisions).toHaveLength(0);
    expect(meta.revisionCount).toBe(0);
    expect(meta.to.unsavedEditsBy).toBeUndefined();
  });

  it("accepts a date without a time", async () => {
    const { user, accessToken, document } = await setup();
    await edit(document, user, "Content");

    const res = await callMcpTool(server, accessToken, "get_document_changes", {
      id: document.id,
      from: "2000-01-01",
    });
    const { meta, diff } = parse(res);

    expect(res?.result?.isError).not.toBe(true);
    expect(meta.from.createdAt).toEqual("2000-01-01T00:00:00.000Z");
    expect(diff).toContain("+Content");
  });

  it("reports no changes", async () => {
    const { user, accessToken, document } = await setup();
    const first = await edit(document, user, "Same");

    const res = await callMcpTool(server, accessToken, "get_document_changes", {
      id: document.id,
      from: first.id,
    });
    const { meta, diff } = parse(res);

    expect(meta.hasChanges).toBe(false);
    expect(diff).toEqual("No changes to the document content.");
  });

  it("reports changes that are too large to diff", async () => {
    const { user, accessToken, document } = await setup();
    const first = await edit(document, user, "Before");
    await edit(document, user, "After");
    const spy = vi
      .spyOn(DocumentHelper, "toMarkdownDiff")
      .mockReturnValue(undefined);

    try {
      const res = await callMcpTool(
        server,
        accessToken,
        "get_document_changes",
        { id: document.id, from: first.id }
      );
      const { meta, diff } = parse(res);

      expect(res?.result?.isError).not.toBe(true);
      expect(meta.tooLarge).toBe(true);
      expect(meta.hasChanges).toBe(true);
      expect(meta.revisions).toHaveLength(1);
      expect(diff).toContain("too large");
    } finally {
      spy.mockRestore();
    }
  });

  it("rejects a revision from another document", async () => {
    const { user, accessToken, document } = await setup();
    const otherDocument = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    const revision = await edit(otherDocument, user, "Other");

    const res = await callMcpTool(server, accessToken, "get_document_changes", {
      id: document.id,
      from: revision.id,
    });

    expect(res?.result?.isError).toBe(true);
  });

  it.each(["yesterday", "1", "2026-10-20T10:00", "not-a-uuid"])(
    "rejects an invalid from value %s",
    async (from) => {
      const { accessToken, document } = await setup();

      const res = await callMcpTool(
        server,
        accessToken,
        "get_document_changes",
        { id: document.id, from }
      );

      expect(res?.result?.isError).toBe(true);
    }
  );

  it("rejects my_last_edit when the user has no revisions", async () => {
    const { user, accessToken, document } = await setup();
    const other = await buildUser({ teamId: user.teamId });
    await edit(document, other, "Theirs");

    const res = await callMcpTool(server, accessToken, "get_document_changes", {
      id: document.id,
      from: "my_last_edit",
    });

    expect(res?.result?.isError).toBe(true);
  });

  it("does not return changes for a document in another team", async () => {
    const { user, document } = await setup();
    const revision = await edit(document, user, "Secret");
    const { accessToken } = await buildOAuthUser();

    const res = await callMcpTool(server, accessToken, "get_document_changes", {
      id: document.id,
      from: revision.id,
    });

    expect(res?.result?.isError).toBe(true);
    expect(JSON.stringify(res)).not.toContain("Secret");
  });

  it("is not available without access to revisions", async () => {
    const { user } = await setup();
    const auth = await buildOAuthAuthentication({
      user,
      scope: ["documents:read"],
    });

    const { body } = mcpRequest("tools/list");
    const res = await server.post("/mcp/", {
      headers: mcpHeaders(auth.accessToken!),
      body,
    });
    const parsed = (await parseMcpResponse(res)) as {
      result?: { tools?: { name: string }[] };
    };
    const names = (parsed.result?.tools ?? []).map((tool) => tool.name);

    expect(names).toContain("fetch");
    expect(names).not.toContain("get_document_changes");
  });

  it("is available with read scope", async () => {
    const { user, document } = await setup();
    const revision = await edit(document, user, "Content");
    const auth = await buildOAuthAuthentication({
      user,
      scope: [Scope.Read],
    });

    const res = await callMcpTool(
      server,
      auth.accessToken!,
      "get_document_changes",
      { id: document.id, from: revision.id }
    );

    expect(res?.result?.isError).not.toBe(true);
  });
});
