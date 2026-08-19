import { DocumentPermission, ExportContentType } from "@shared/types";
import { createContext } from "@server/context";
import { UserMembership, Revision } from "@server/models";
import FileStorage from "@server/storage/files";
import {
  buildAdmin,
  buildAttachment,
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import { getTestServer, readZipResponse } from "@server/test/support";

const server = getTestServer();

describe("#revisions.info", () => {
  it("should return a document revision", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );
    const res = await server.post("/api/revisions.info", user, {
      body: {
        id: revision.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).not.toEqual(document.id);
    expect(body.data.title).toEqual(document.title);
    // The single revision endpoint includes the full document content.
    expect(body.data.data).toBeDefined();
    expect(body.data.text).toBeDefined();
  });

  it("should require authorization", async () => {
    const admin = await buildAdmin();
    const document = await buildDocument({
      teamId: admin.teamId,
      userId: admin.id,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user: admin }),
      document
    );
    const user = await buildUser();
    const res = await server.post("/api/revisions.info", user, {
      body: {
        id: revision.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#revisions.update", () => {
  it("should update a document revision", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );

    const res = await server.post("/api/revisions.update", user, {
      body: {
        id: revision.id,
        name: "new name",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("new name");
  });

  it("should allow setting name to null", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );

    const res = await server.post("/api/revisions.update", user, {
      body: {
        id: revision.id,
        name: null,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBeNull();
  });

  it("should not allow setting name to empty string", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );

    const res = await server.post("/api/revisions.update", user, {
      body: {
        id: revision.id,
        name: "",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should allow an admin to update a document revision", async () => {
    const admin = await buildAdmin();
    const document = await buildDocument({
      teamId: admin.teamId,
      userId: admin.id,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user: admin }),
      document
    );

    const res = await server.post("/api/revisions.update", admin, {
      body: {
        id: revision.id,
        name: "new name",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("new name");
  });

  it("should require authorization", async () => {
    const admin = await buildAdmin();
    const document = await buildDocument({
      teamId: admin.teamId,
      userId: admin.id,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user: admin }),
      document
    );
    const user = await buildUser();
    const res = await server.post("/api/revisions.update", user, {
      body: {
        id: revision.id,
        name: "new name",
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#revisions.list", () => {
  it("should return a document's revisions", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await Revision.createFromDocument(createContext({ user }), document);
    const res = await server.post("/api/revisions.list", user, {
      body: {
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).not.toEqual(document.id);
    expect(body.data[0].title).toEqual(document.title);
  });

  it("should not include document content for listed revisions", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await Revision.createFromDocument(createContext({ user }), document);
    const res = await server.post("/api/revisions.list", user, {
      body: {
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    // The (potentially large) content is omitted from the list response and
    // only loaded when a single revision is opened via revisions.info.
    expect(body.data[0].data).toBeUndefined();
    expect(body.data[0].text).toBeUndefined();
  });

  it("should not return revisions for document in collection not a member of", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    await Revision.createFromDocument(createContext({ user }), document);
    collection.permission = null;
    await collection.save();
    await UserMembership.destroy({
      where: {
        userId: user.id,
        collectionId: collection.id,
      },
    });
    const res = await server.post("/api/revisions.list", user, {
      body: {
        documentId: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should return revisions for a deleted document to a user that can restore it", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await Revision.createFromDocument(createContext({ user }), document);
    await document.destroy();
    const res = await server.post("/api/revisions.list", user, {
      body: {
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });

  it("should not return revisions for a deleted document to a read-only user", async () => {
    const author = await buildUser();
    const user = await buildUser({ teamId: author.teamId });
    const collection = await buildCollection({
      userId: author.id,
      teamId: author.teamId,
      permission: null,
    });
    const document = await buildDocument({
      userId: author.id,
      collectionId: collection.id,
      teamId: author.teamId,
    });
    await UserMembership.create({
      documentId: document.id,
      userId: user.id,
      createdById: author.id,
      permission: DocumentPermission.Read,
    });
    await Revision.createFromDocument(
      createContext({ user: author }),
      document
    );
    await document.destroy();
    const res = await server.post("/api/revisions.list", user, {
      body: {
        documentId: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authorization", async () => {
    const document = await buildDocument();
    const user = await buildUser();
    const res = await server.post("/api/revisions.list", user, {
      body: {
        documentId: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#revisions.export", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should stream a zip when the revision has attachments", async () => {
    const user = await buildUser();
    const attachment = await buildAttachment({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      title: "Export Test",
      userId: user.id,
      teamId: user.teamId,
      text: `![image](${attachment.redirectUrl})`,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );
    vi.spyOn(FileStorage, "getFileBuffer").mockResolvedValue(
      Buffer.from("image-data")
    );

    const res = await server.post("/api/revisions.export", user, {
      body: {
        id: revision.id,
      },
      headers: {
        accept: "text/markdown",
      },
    });

    expect(res.status).toEqual(200);
    expect(res.headers.get("content-type")).toEqual("application/zip");
    expect(res.headers.get("content-disposition")).toContain(
      `filename="export-test.zip"`
    );

    const location = `attachments/${attachment.id}.png`;
    const entries = await readZipResponse(res);
    expect(Object.keys(entries).sort()).toEqual([location, "export-test.md"]);
    expect(entries[location]).toEqual("image-data");
    expect(entries["export-test.md"]).toContain(location);
    expect(entries["export-test.md"]).not.toContain(attachment.redirectUrl);
  });

  it("should stream a textpack when TextBundle is requested", async () => {
    const user = await buildUser();
    const attachment = await buildAttachment(
      { teamId: user.teamId, userId: user.id, contentType: "image/png" },
      "photo.png"
    );
    const document = await buildDocument({
      title: "Export Test",
      userId: user.id,
      teamId: user.teamId,
      text: `![image](${attachment.redirectUrl})`,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );
    vi.spyOn(FileStorage, "getFileBuffer").mockResolvedValue(
      Buffer.from("image-data")
    );

    const res = await server.post("/api/revisions.export", user, {
      body: {
        id: revision.id,
      },
      headers: {
        accept: ExportContentType.TextBundle,
      },
    });

    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toContain(
      `filename="export-test.textpack"`
    );

    const bundle = "export-test.textbundle";
    const entries = await readZipResponse(res);
    expect(Object.keys(entries).sort()).toEqual([
      `${bundle}/assets/photo.png`,
      `${bundle}/info.json`,
      `${bundle}/text.markdown`,
    ]);
    expect(entries[`${bundle}/assets/photo.png`]).toEqual("image-data");
    expect(entries[`${bundle}/text.markdown`]).toContain("assets/photo.png");

    // The bundle points back at the revision it was built from, rather than the
    // current version of the document.
    const info = JSON.parse(entries[`${bundle}/info.json`]);
    expect(info.type).toEqual("net.daringfireball.markdown");
    expect(info.sourceURL).toContain(`/history/${revision.id}`);
  });

  it("should stream a textpack when TextBundle is requested for a revision with no attachments", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      title: "Plain Export",
      userId: user.id,
      teamId: user.teamId,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );

    const res = await server.post("/api/revisions.export", user, {
      body: {
        id: revision.id,
      },
      headers: {
        accept: ExportContentType.TextBundle,
      },
    });

    expect(res.status).toEqual(200);

    // A bundle is a directory, so there is no self-contained single file form
    // to fall back to when nothing is referenced.
    const entries = await readZipResponse(res);
    expect(Object.keys(entries).sort()).toEqual([
      "plain-export.textbundle/info.json",
      "plain-export.textbundle/text.markdown",
    ]);
  });

  it("should return revision as markdown by default", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );
    const res = await server.post("/api/revisions.export", user, {
      body: {
        id: revision.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toContain(document.title);
  });

  it("should return revision as markdown with accept header", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );
    const res = await server.post("/api/revisions.export", user, {
      body: {
        id: revision.id,
      },
      headers: {
        accept: "text/markdown",
      },
    });
    const body = await res.text();
    expect(res.status).toEqual(200);
    expect(body).toContain(document.title);
  });

  it("should return revision as html with accept header", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );
    const res = await server.post("/api/revisions.export", user, {
      body: {
        id: revision.id,
      },
      headers: {
        accept: "text/html",
      },
    });
    const body = await res.text();
    expect(res.status).toEqual(200);
    expect(body).toContain("<html");
    expect(body).toContain(document.title);
  });

  it("should require authorization without token", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );
    const res = await server.post("/api/revisions.export", {
      body: {
        id: revision.id,
      },
    });
    expect(res.status).toEqual(401);
  });

  it("should require authorization with incorrect token", async () => {
    const admin = await buildAdmin();
    const document = await buildDocument({
      teamId: admin.teamId,
      userId: admin.id,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user: admin }),
      document
    );
    const user = await buildUser();
    const res = await server.post("/api/revisions.export", user, {
      body: {
        id: revision.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});
