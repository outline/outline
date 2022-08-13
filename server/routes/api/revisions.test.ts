import { Revision } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { seed, getTestDatabase, getTestServer } from "@server/test/support";

const db = getTestDatabase();
const server = getTestServer();

afterAll(server.disconnect);

beforeEach(db.flush);

describe("#revisions.info", () => {
  it("should return a document revision", async () => {
    const { user, document } = await seed();
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

describe("#revisions.list", () => {
  it("should return a document's revisions", async () => {
    const { user, document } = await seed();
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
    const { user, document, collection } = await seed();
    await Revision.createFromDocument(document);
    collection.permission = null;
    await collection.save();
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
