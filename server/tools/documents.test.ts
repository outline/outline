import { CollectionPermission, DocumentPermission, Scope } from "@shared/types";
import {
  buildUser,
  buildViewer,
  buildCollection,
  buildDocument,
  buildAttachment,
  buildTemplate,
  buildOAuthAuthentication,
  buildGroup,
} from "@server/test/factories";
import {
  Attachment,
  Document,
  GroupMembership,
  UserMembership,
} from "@server/models";
import { getTestServer } from "@server/test/support";
import DocumentImportTask from "@server/queues/tasks/DocumentImportTask";
import { buildOAuthUser, callMcpTool } from "@server/test/McpHelper";

const server = getTestServer();

describe("list_documents", () => {
  it("returns recent documents", async () => {
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

    const res = await callMcpTool(server, accessToken, "list_documents");
    const data = (res?.result?.content ?? []).map((c: { text: string }) =>
      JSON.parse(c.text)
    );

    const ids = data.map((d: { document: { id: string } }) => d.document.id);
    expect(ids).toContain(document.id);

    const match = data.find(
      (d: { document: { id: string } }) => d.document.id === document.id
    ) as { document: { url: string } };
    expect(match.document.url).toMatch(/^https?:\/\//);
    expect(
      (match.document as { commentCount?: number }).commentCount
    ).toBeUndefined();
  });

  it("does not return templates in recent documents", async () => {
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
    const template = await buildTemplate({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });

    const res = await callMcpTool(server, accessToken, "list_documents");
    const data = (res?.result?.content ?? []).map((c: { text: string }) =>
      JSON.parse(c.text)
    );

    const ids = data.map((d: { document: { id: string } }) => d.document.id);
    expect(ids).toContain(document.id);
    expect(ids).not.toContain(template.id);
  });

  it("filters by collection", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection1 = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const collection2 = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const doc1 = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection1.id,
    });
    await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection2.id,
    });

    const res = await callMcpTool(server, accessToken, "list_documents", {
      collectionId: collection1.id,
    });
    const data = (res?.result?.content ?? []).map((c: { text: string }) =>
      JSON.parse(c.text)
    );

    const ids = data.map((d: { document: { id: string } }) => d.document.id);
    expect(ids).toContain(doc1.id);
    expect(
      data.every(
        (d: { document: { collectionId: string } }) =>
          d.document.collectionId === collection1.id
      )
    ).toBe(true);
  });

  it("returns documents shared directly with the user", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const author = await buildUser({ teamId: user.teamId });
    // A document in a private collection the user is not a member of, shared
    // directly with the user via a membership ("Shared with me").
    const collection = await buildCollection({
      teamId: author.teamId,
      userId: author.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: author.teamId,
      userId: author.id,
      collectionId: collection.id,
      title: "Metaphysics",
    });
    await UserMembership.create({
      documentId: document.id,
      userId: user.id,
      createdById: author.id,
      permission: DocumentPermission.Read,
    });

    const res = await callMcpTool(server, accessToken, "list_documents");
    const data = (res?.result?.content ?? []).map((c: { text: string }) =>
      JSON.parse(c.text)
    );

    const ids = data.map((d: { document: { id: string } }) => d.document.id);
    expect(ids).toContain(document.id);
  });

  it("returns documents shared with the user via a group", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const author = await buildUser({ teamId: user.teamId });
    const collection = await buildCollection({
      teamId: author.teamId,
      userId: author.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: author.teamId,
      userId: author.id,
      collectionId: collection.id,
      title: "Metaphysics",
    });

    const group = await buildGroup({ teamId: user.teamId });
    await group.$add("user", user, { through: { createdById: author.id } });
    await GroupMembership.create({
      createdById: author.id,
      groupId: group.id,
      documentId: document.id,
    });

    const res = await callMcpTool(server, accessToken, "list_documents");
    const data = (res?.result?.content ?? []).map((c: { text: string }) =>
      JSON.parse(c.text)
    );

    const ids = data.map((d: { document: { id: string } }) => d.document.id);
    expect(ids).toContain(document.id);
  });

  it("does not return private documents via exact urlId match", async () => {
    const owner = await buildUser();
    const otherUser = await buildUser({ teamId: owner.teamId });

    const privateCollection = await buildCollection({
      teamId: owner.teamId,
      userId: owner.id,
      permission: null,
    });
    const privateDocument = await buildDocument({
      teamId: owner.teamId,
      userId: owner.id,
      collectionId: privateCollection.id,
      title: "Confidential",
    });

    const auth = await buildOAuthAuthentication({
      user: otherUser,
      scope: [Scope.Read],
    });

    const res = await callMcpTool(server, auth.accessToken!, "list_documents", {
      query: privateDocument.urlId,
    });

    const data = (res?.result?.content ?? []).map((c: { text?: string }) =>
      JSON.parse(c.text ?? "{}")
    );
    const ids = data.map((d: { document: { id: string } }) => d.document.id);

    expect(res?.result?.isError).not.toBe(true);
    expect(ids).not.toContain(privateDocument.id);
  });

  it("returns documents via exact urlId match when the user has access", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      permission: CollectionPermission.ReadWrite,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });

    const auth = await buildOAuthAuthentication({
      user,
      scope: [Scope.Read],
    });

    const res = await callMcpTool(server, auth.accessToken!, "list_documents", {
      query: document.urlId,
    });

    const data = (res?.result?.content ?? []).map((c: { text?: string }) =>
      JSON.parse(c.text ?? "{}")
    );
    const ids = data.map((d: { document: { id: string } }) => d.document.id);

    expect(ids).toContain(document.id);
  });
});

describe("create_document", () => {
  it("creates in a collection", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await callMcpTool(server, accessToken, "create_document", {
      title: "New Document",
      text: "Hello world",
      collectionId: collection.id,
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.document.title).toEqual("New Document");
    expect(data.document.collectionId).toEqual(collection.id);
    expect(data.document.id).toBeDefined();
    expect(data.document.url).toMatch(/^https?:\/\//);
  });

  it("creates nested under parent document", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const parent = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });

    const res = await callMcpTool(server, accessToken, "create_document", {
      title: "Child Document",
      text: "Nested content",
      parentDocumentId: parent.id,
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.document.title).toEqual("Child Document");
    expect(data.document.parentDocumentId).toEqual(parent.id);
  });

  it("creates from a template", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const template = await buildTemplate({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
      text: "Content from the template",
    });

    const res = await callMcpTool(server, accessToken, "create_document", {
      title: "From Template",
      collectionId: collection.id,
      templateId: template.id,
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");
    const text = res?.result?.content?.[1]?.text ?? "";

    expect(res?.result?.isError).not.toBe(true);
    expect(data.document.title).toEqual("From Template");
    expect(data.document.templateId).toEqual(template.id);
    expect(text).toContain("Content from the template");
  });

  it("defaults the title to the template title", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const template = await buildTemplate({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
      title: "Template Title",
    });

    const res = await callMcpTool(server, accessToken, "create_document", {
      collectionId: collection.id,
      templateId: template.id,
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(res?.result?.isError).not.toBe(true);
    expect(data.document.title).toEqual("Template Title");
  });

  it("does not allow creating from a template the user cannot access", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const otherUser = await buildUser();
    const otherCollection = await buildCollection({
      teamId: otherUser.teamId,
      userId: otherUser.id,
    });
    const template = await buildTemplate({
      teamId: otherUser.teamId,
      userId: otherUser.id,
      collectionId: otherCollection.id,
    });

    const res = await callMcpTool(server, accessToken, "create_document", {
      title: "From Template",
      collectionId: collection.id,
      templateId: template.id,
    });

    expect(res?.result?.isError).toBe(true);
  });

  it("does not allow a viewer to create a draft", async () => {
    const user = await buildViewer();
    const auth = await buildOAuthAuthentication({
      user,
      scope: [Scope.Read, Scope.Write, Scope.Create],
    });

    const res = await callMcpTool(
      server,
      auth.accessToken!,
      "create_document",
      {
        title: "Viewer Draft",
        text: "Should not be created",
        publish: false,
      }
    );

    expect(res?.result?.isError).toBe(true);

    const documents = await Document.unscoped().findAll({
      where: { createdById: user.id },
    });
    expect(documents.length).toEqual(0);
  });

  it("does not allow a viewer to create a document in a collection", async () => {
    const user = await buildViewer();
    const collection = await buildCollection({
      teamId: user.teamId,
      permission: CollectionPermission.ReadWrite,
    });
    const auth = await buildOAuthAuthentication({
      user,
      scope: [Scope.Read, Scope.Write, Scope.Create],
    });

    const res = await callMcpTool(
      server,
      auth.accessToken!,
      "create_document",
      {
        title: "Viewer Document",
        collectionId: collection.id,
      }
    );

    expect(res?.result?.isError).toBe(true);

    const documents = await Document.unscoped().findAll({
      where: { createdById: user.id },
    });
    expect(documents.length).toEqual(0);
  });
});

describe("prepare_document_file_upload", () => {
  it("creates a temporary upload for a source file", async () => {
    const { user, accessToken } = await buildOAuthUser();

    const res = await callMcpTool(
      server,
      accessToken,
      "prepare_document_file_upload",
      {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        name: "proposal.docx",
        size: 1000,
      }
    );
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(res?.result?.isError).toBeUndefined();
    expect(data.uploadUrl).toMatch(/^https?:\/\//);
    expect(data.form["Content-Type"]).toEqual(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(data.attachment.id).toBeDefined();
    expect(data.attachment.url).toMatch(/^https?:\/\//);
    expect(data.curlCommand).toContain(data.uploadUrl);

    const attachment = await Attachment.findByPk(data.attachment.id, {
      rejectOnEmpty: true,
    });
    expect(attachment.name).toEqual("proposal.docx");
    expect(attachment.contentType).toEqual(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(attachment.teamId).toEqual(user.teamId);
    expect(attachment.userId).toEqual(user.id);
    expect(attachment.expiresAt).toBeTruthy();
  });

  it("read-only token does not have document file upload tool", async () => {
    const user = await buildUser();
    const auth = await buildOAuthAuthentication({
      user,
      scope: [Scope.Read],
    });

    const res = await callMcpTool(
      server,
      auth.accessToken!,
      "prepare_document_file_upload",
      {
        contentType: "text/html",
        name: "webpage.html",
        size: 1000,
      }
    );

    expect(res?.result?.isError).toBe(true);
  });
});

describe("create_document_from_uploaded_file", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not expose legacy document file import tool names", async () => {
    const { accessToken } = await buildOAuthUser();

    const combinedToolRes = await callMcpTool(
      server,
      accessToken,
      "create_document_from_file",
      {
        contentType: "text/html",
        name: "webpage.html",
        size: 1000,
      }
    );
    const legacyImportRes = await callMcpTool(
      server,
      accessToken,
      "import_document",
      {
        contentType: "text/html",
        name: "webpage.html",
        size: 1000,
      }
    );
    const uploadOnlyRes = await callMcpTool(
      server,
      accessToken,
      "create_import_upload",
      {
        contentType: "text/html",
        name: "webpage.html",
        size: 1000,
      }
    );

    expect(combinedToolRes?.result?.isError).toBe(true);
    expect(legacyImportRes?.result?.isError).toBe(true);
    expect(uploadOnlyRes?.result?.isError).toBe(true);
  });

  it("read-only token does not have uploaded file creation tool", async () => {
    const user = await buildUser();
    const auth = await buildOAuthAuthentication({
      user,
      scope: [Scope.Read],
    });

    const importRes = await callMcpTool(
      server,
      auth.accessToken!,
      "create_document_from_uploaded_file",
      {
        attachmentId: "11111111-1111-4111-8111-111111111111",
        collectionId: "22222222-2222-4222-8222-222222222222",
      }
    );

    expect(importRes?.result?.isError).toBe(true);
  });

  it("creates a document from an uploaded HTML file in a collection", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
      title: "Imported Title",
      text: "Hello from HTML",
    });
    const uploadRes = await callMcpTool(
      server,
      accessToken,
      "prepare_document_file_upload",
      {
        contentType: "text/html",
        name: "webpage.html",
        size: 1000,
      }
    );
    const uploadData = JSON.parse(
      uploadRes?.result?.content?.[0]?.text ?? "{}"
    );
    const attachment = await Attachment.findByPk(uploadData.attachment.id, {
      rejectOnEmpty: true,
    });
    vi.spyOn(DocumentImportTask.prototype, "schedule").mockResolvedValue({
      finished: vi.fn().mockResolvedValue({ documentId: document.id }),
    } as unknown as Awaited<ReturnType<DocumentImportTask["schedule"]>>);

    const res = await callMcpTool(
      server,
      accessToken,
      "create_document_from_uploaded_file",
      {
        attachmentId: attachment.id,
        collectionId: collection.id,
        publish: true,
      }
    );
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(res?.result?.isError).toBeUndefined();
    expect(data.document.title).toEqual("Imported Title");
    expect(data.document.collectionId).toEqual(collection.id);
    expect(data.document.url).toMatch(/^https?:\/\//);
    expect(res?.result?.content?.[1]?.text).toContain("Hello from HTML");
  });

  it("queues import for an uploaded document source file", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
      title: "Queued Import",
    });
    const uploadRes = await callMcpTool(
      server,
      accessToken,
      "prepare_document_file_upload",
      {
        contentType: "text/html",
        name: "webpage.html",
        size: 1000,
      }
    );
    const uploadData = JSON.parse(
      uploadRes?.result?.content?.[0]?.text ?? "{}"
    );
    const attachment = await Attachment.findByPk(uploadData.attachment.id, {
      rejectOnEmpty: true,
    });
    const finished = vi.fn().mockResolvedValue({ documentId: document.id });
    const schedule = vi
      .spyOn(DocumentImportTask.prototype, "schedule")
      .mockResolvedValue({
        finished,
      } as unknown as Awaited<ReturnType<DocumentImportTask["schedule"]>>);

    const res = await callMcpTool(
      server,
      accessToken,
      "create_document_from_uploaded_file",
      {
        attachmentId: attachment.id,
        collectionId: collection.id,
        publish: true,
      }
    );

    expect(res?.result?.isError).toBeUndefined();
    expect(schedule).toHaveBeenCalledWith({
      key: attachment.key,
      sourceMetadata: {
        fileName: attachment.name,
        mimeType: attachment.contentType,
      },
      userId: user.id,
      collectionId: collection.id,
      parentDocumentId: undefined,
      publish: true,
      ip: expect.any(String),
    });
    expect(finished).toHaveBeenCalled();
  });

  it("rejects regular document attachments as import source files", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const sourceDocument = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });
    const attachment = await buildAttachment(
      {
        teamId: user.teamId,
        userId: user.id,
        documentId: sourceDocument.id,
        contentType: "text/html",
        expiresAt: null,
      },
      "webpage.html"
    );
    const schedule = vi.spyOn(DocumentImportTask.prototype, "schedule");

    const res = await callMcpTool(
      server,
      accessToken,
      "create_document_from_uploaded_file",
      {
        attachmentId: attachment.id,
        collectionId: collection.id,
      }
    );

    expect(res?.result?.isError).toBe(true);
    expect(res?.result?.content?.[0]?.text).toContain(
      "must be uploaded with prepare_document_file_upload"
    );
    expect(schedule).not.toHaveBeenCalled();
  });
});

describe("update_document", () => {
  it("updates title and text", async () => {
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

    const res = await callMcpTool(server, accessToken, "update_document", {
      id: document.id,
      title: "Updated Title",
      text: "Updated content",
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.document.title).toEqual("Updated Title");
    expect(data.document.url).toMatch(/^https?:\/\//);
  });

  it("unpublishes a document", async () => {
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

    const res = await callMcpTool(server, accessToken, "update_document", {
      id: document.id,
      publish: false,
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.document.id).toEqual(document.id);
    expect(res?.result?.isError).toBeUndefined();
  });

  it("fails to unpublish a document with children", async () => {
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
    await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
      parentDocumentId: document.id,
    });

    const res = await callMcpTool(server, accessToken, "update_document", {
      id: document.id,
      publish: false,
    });

    expect(res?.result?.isError).toBe(true);
  });

  it("does not allow a viewer to publish their draft into a restricted collection", async () => {
    const viewer = await buildViewer();
    const collection = await buildCollection({
      teamId: viewer.teamId,
      permission: CollectionPermission.ReadWrite,
    });
    const draft = await buildDocument({
      teamId: viewer.teamId,
      userId: viewer.id,
      collectionId: null,
      publishedAt: null,
    });
    const auth = await buildOAuthAuthentication({
      user: viewer,
      scope: [Scope.Read, Scope.Write, Scope.Create],
    });

    const res = await callMcpTool(
      server,
      auth.accessToken!,
      "update_document",
      {
        id: draft.id,
        publish: true,
        collectionId: collection.id,
      }
    );

    expect(res?.result?.isError).toBe(true);

    const reloaded = await Document.unscoped().findByPk(draft.id);
    expect(reloaded?.collectionId).toBeNull();
    expect(reloaded?.publishedAt).toBeNull();
  });
});

describe("move_document", () => {
  it("moves to a different collection", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection1 = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const collection2 = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection1.id,
    });

    const res = await callMcpTool(server, accessToken, "move_document", {
      id: document.id,
      collectionId: collection2.id,
    });
    const data = (res?.result?.content ?? []).map((c: { text: string }) =>
      JSON.parse(c.text)
    );

    expect(res?.result?.isError).toBeUndefined();
    const moved = data.find(
      (d: { document: { id: string } }) => d.document.id === document.id
    ) as { document: { collectionId: string } };
    expect(moved).toBeDefined();
    expect(moved.document.collectionId).toEqual(collection2.id);
  });

  it("moves under a parent document", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const parent = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });
    const child = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });

    const res = await callMcpTool(server, accessToken, "move_document", {
      id: child.id,
      parentDocumentId: parent.id,
    });
    const data = (res?.result?.content ?? []).map((c: { text: string }) =>
      JSON.parse(c.text)
    );

    expect(res?.result?.isError).toBeUndefined();
    const moved = data.find(
      (d: { document: { id: string } }) => d.document.id === child.id
    ) as { document: { parentDocumentId: string } };
    expect(moved).toBeDefined();
    expect(moved.document.parentDocumentId).toEqual(parent.id);
  });

  it("fails without collectionId or parentDocumentId", async () => {
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

    const res = await callMcpTool(server, accessToken, "move_document", {
      id: document.id,
    });

    expect(res?.result?.isError).toBe(true);
  });

  it("fails when nesting a document inside itself", async () => {
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

    const res = await callMcpTool(server, accessToken, "move_document", {
      id: document.id,
      parentDocumentId: document.id,
    });

    expect(res?.result?.isError).toBe(true);
  });
});

describe("restore_document", () => {
  it("restores an archived document", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
      archivedAt: new Date(),
    });

    const res = await callMcpTool(server, accessToken, "restore_document", {
      id: document.id,
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(res?.result?.isError).toBeUndefined();
    expect(data.document.id).toEqual(document.id);

    const reloaded = await Document.unscoped().findByPk(document.id);
    expect(reloaded?.archivedAt).toBeNull();
  });

  it("restores a trashed document", async () => {
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
    await document.destroy();

    const res = await callMcpTool(server, accessToken, "restore_document", {
      id: document.id,
    });

    expect(res?.result?.isError).toBeUndefined();

    const reloaded = await Document.unscoped().findByPk(document.id, {
      paranoid: false,
    });
    expect(reloaded?.deletedAt).toBeNull();
  });

  it("restores into a different collection", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const source = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const destination = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: source.id,
      archivedAt: new Date(),
    });

    const res = await callMcpTool(server, accessToken, "restore_document", {
      id: document.id,
      collectionId: destination.id,
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(res?.result?.isError).toBeUndefined();
    expect(data.document.collectionId).toEqual(destination.id);
  });

  it("fails when the document is not archived or trashed", async () => {
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

    const res = await callMcpTool(server, accessToken, "restore_document", {
      id: document.id,
    });

    expect(res?.result?.isError).toBe(true);
  });
});
