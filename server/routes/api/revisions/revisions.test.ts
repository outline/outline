import { createContext } from "@server/context";
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
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );
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
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );

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
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );

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
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );

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
      userId: admin.id,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user: admin }),
      document
    );

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

describe("#revisions.list", () => {
  it("should return a document's revisions", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await Revision.createFromDocument(createContext({ user }), document);
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
    await Revision.createFromDocument(createContext({ user }), document);
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

describe("#revisions.export", () => {
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
    const res = await server.post("/api/revisions.export", {
      body: {
        token: user.getJwtToken(),
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
    const res = await server.post("/api/revisions.export", {
      body: {
        token: user.getJwtToken(),
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
    const res = await server.post("/api/revisions.export", {
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
    const res = await server.post("/api/revisions.export", {
      body: {
        token: user.getJwtToken(),
        id: revision.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});
