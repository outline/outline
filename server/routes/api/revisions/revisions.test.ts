import { UserMembership, Revision } from "@server/models";
import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#revisions.info", () => {
  it("should return a document revision", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const revision = await Revision.createFromDocument(document);
    const res = await server.post("/api/revisions.info", {
      body: {
        token: user.getJwtToken(),
        id: revision.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).not.toEqual(document.id);
    expect(body.data.title).toEqual(document.title);
  });

  it("should require authorization", async () => {
    const document = await buildDocument();
    const revision = await Revision.createFromDocument(document);
    const user = await buildUser();
    const res = await server.post("/api/revisions.info", {
      body: {
        token: user.getJwtToken(),
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
    const revision = await Revision.createFromDocument(document);

    const res = await server.post("/api/revisions.update", {
      body: {
        token: user.getJwtToken(),
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
    const revision = await Revision.createFromDocument(document);

    const res = await server.post("/api/revisions.update", {
      body: {
        token: user.getJwtToken(),
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
    const revision = await Revision.createFromDocument(document);

    const res = await server.post("/api/revisions.update", {
      body: {
        token: user.getJwtToken(),
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
    });
    const revision = await Revision.createFromDocument(document);

    const res = await server.post("/api/revisions.update", {
      body: {
        token: admin.getJwtToken(),
        id: revision.id,
        name: "new name",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("new name");
  });

  it("should require authorization", async () => {
    const document = await buildDocument();
    const revision = await Revision.createFromDocument(document);
    const user = await buildUser();
    const res = await server.post("/api/revisions.update", {
      body: {
        token: user.getJwtToken(),
        id: revision.id,
        name: "new name",
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#revisions.diff", () => {
  it("should return the document HTML if no previous revision", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const revision = await Revision.createFromDocument(document);
    const res = await server.post("/api/revisions.diff", {
      body: {
        token: user.getJwtToken(),
        id: revision.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);

    // Can't compare entire HTML output due to generated class names
    expect(body.data).toContain("<html");
    expect(body.data).toContain("<style");
    expect(body.data).toContain("<h1");
    expect(body.data).not.toContain("<ins");
    expect(body.data).not.toContain("<del");
    expect(body.data).toContain(document.title);
  });

  it("should allow returning HTML directly with accept header", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const revision = await Revision.createFromDocument(document);

    const res = await server.post("/api/revisions.diff", {
      body: {
        token: user.getJwtToken(),
        id: revision.id,
      },
      headers: {
        accept: "text/html",
      },
    });
    const body = await res.text();
    expect(res.status).toEqual(200);

    // Can't compare entire HTML output due to generated class names
    expect(body).toContain("<html");
    expect(body).toContain("<style");
    expect(body).toContain("<h1");
    expect(body).not.toContain("<ins");
    expect(body).not.toContain("<del");
    expect(body).toContain(document.title);
  });

  it("should compare to previous revision by default", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await Revision.createFromDocument(document);

    await document.update({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                content: [],
                type: "text",
                text: "New text",
              },
            ],
          },
        ],
      },
    });
    const revision1 = await Revision.createFromDocument(document);

    const res = await server.post("/api/revisions.diff", {
      body: {
        token: user.getJwtToken(),
        id: revision1.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);

    // Can't compare entire HTML output due to generated class names
    expect(body.data).toContain("<html");
    expect(body.data).toContain("<style");
    expect(body.data).toContain("<h1");
    expect(body.data).toContain("<ins");
    expect(body.data).toContain("<del");
    expect(body.data).toContain(document.title);
  });

  it("should require authorization", async () => {
    const document = await buildDocument();
    const revision = await Revision.createFromDocument(document);
    const user = await buildUser();
    const res = await server.post("/api/revisions.diff", {
      body: {
        token: user.getJwtToken(),
        id: revision.id,
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
    await Revision.createFromDocument(document);
    const res = await server.post("/api/revisions.list", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).not.toEqual(document.id);
    expect(body.data[0].title).toEqual(document.title);
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
    await Revision.createFromDocument(document);
    collection.permission = null;
    await collection.save();
    await UserMembership.destroy({
      where: {
        userId: user.id,
        collectionId: collection.id,
      },
    });
    const res = await server.post("/api/revisions.list", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authorization", async () => {
    const document = await buildDocument();
    const user = await buildUser();
    const res = await server.post("/api/revisions.list", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});
