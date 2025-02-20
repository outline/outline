import { Collection, Document, Pin, User } from "@server/models";
import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildDraftDocument,
  buildPin,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#pins.create", () => {
  let admin: User;
  let user: User;
  let anotherUser: User;
  let document: Document;
  let collection: Collection;

  beforeEach(async () => {
    admin = await buildAdmin();
    [user, anotherUser] = await Promise.all([
      buildUser({ teamId: admin.teamId }),
      buildUser(),
    ]);
    collection = await buildCollection({
      createdById: admin.id,
      teamId: admin.teamId,
    });
    document = await buildDocument({
      createdById: admin.id,
      teamId: admin.teamId,
      collectionId: collection.id,
    });
  });

  it("should fail with status 401 unauthorized when user token is missing", async () => {
    const res = await server.post("/api/pins.create", {
      body: {
        documentId: "foo",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body.message).toEqual("Authentication required");
  });

  it("should fail with status 400 bad request when documentId is not suppled", async () => {
    const res = await server.post("/api/pins.create", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("documentId: required");
  });

  it("should fail with status 400 bad request when documentId is invalid", async () => {
    const res = await server.post("/api/pins.create", {
      body: {
        token: user.getJwtToken(),
        documentId: "foo",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("documentId: must be uuid or url slug");
  });

  it("should fail with status 400 bad request when index is invalid", async () => {
    const res = await server.post("/api/pins.create", {
      body: {
        token: user.getJwtToken(),
        documentId: "foo1234567",
        index: "😀",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("index: must be between x20 to x7E ASCII");
  });

  it("should fail with status 403 forbidden when user is disallowed to read the document", async () => {
    const res = await server.post("/api/pins.create", {
      body: {
        token: anotherUser.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Authorization error");
  });

  it("should fail with status 403 forbidden when user is disallowed to update the collection", async () => {
    const res = await server.post("/api/pins.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        collectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Authorization error");
  });

  it("should fail with status 403 forbidden when user is disallowed to pin the document", async () => {
    const draft = await buildDraftDocument({
      createdById: admin.id,
      teamId: admin.teamId,
      collectionId: collection.id,
    });
    const res = await server.post("/api/pins.create", {
      body: {
        token: admin.getJwtToken(),
        // A draft document cannot be pinned, neither by a member nor by an admin
        documentId: draft.id,
        collectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Authorization error");
  });

  it("should fail with status 403 forbidden when user is disallowed to pin the document to home page", async () => {
    const res = await server.post("/api/pins.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Authorization error");
  });

  it("should succeed with status 200 ok when user is allowed to pin", async () => {
    const res = await server.post("/api/pins.create", {
      body: {
        token: admin.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toBeTruthy();
    expect(body.data.documentId).toEqual(document.id);
    expect(body.data.collectionId).toBeNull();
  });

  it("should succeed with status 200 ok when valid collectionId is supplied", async () => {
    const res = await server.post("/api/pins.create", {
      body: {
        token: admin.getJwtToken(),
        documentId: document.id,
        collectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toBeTruthy();
    expect(body.data.documentId).toEqual(document.id);
    expect(body.data.collectionId).toEqual(collection.id);
  });
});

describe("#pins.info", () => {
  it("should provide info about a home pin", async () => {
    const admin = await buildAdmin();
    const document = await buildDocument({
      userId: admin.id,
      teamId: admin.teamId,
    });

    await server.post("/api/pins.create", {
      body: {
        token: admin.getJwtToken(),
        documentId: document.id,
      },
    });

    const res = await server.post("/api/pins.info", {
      body: {
        token: admin.getJwtToken(),
        documentId: document.id,
      },
    });
    const pin = await res.json();

    expect(res.status).toEqual(200);
    expect(pin.data.id).toBeDefined();
    expect(pin.data.documentId).toEqual(document.id);
    expect(pin.data.collectionId).toBeFalsy();
  });

  it("should provide info about a collection pin", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    await server.post("/api/pins.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        collectionId: document.collectionId,
      },
    });

    const res = await server.post("/api/pins.info", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        collectionId: document.collectionId,
      },
    });
    const pin = await res.json();

    expect(res.status).toEqual(200);
    expect(pin.data.id).toBeDefined();
    expect(pin.data.documentId).toEqual(document.id);
    expect(pin.data.collectionId).toEqual(document.collectionId);
  });

  it("should throw 404 if no pin found", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/pins.info", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        collectionId: null,
      },
    });

    expect(res.status).toEqual(404);
  });
});

describe("#pins.list", () => {
  let user: User;
  let pins: Pin[];
  let docs: Document[];
  let collection: Collection;

  beforeEach(async () => {
    user = await buildUser();
    collection = await buildCollection({
      teamId: user.teamId,
      createdById: user.id,
    });
    docs = await Promise.all([
      buildDocument({
        teamId: user.teamId,
        collectionId: collection.id,
      }),
      buildDocument({
        teamId: user.teamId,
        collectionId: collection.id,
      }),
    ]);
    pins = await Promise.all([
      buildPin({
        createdById: user.id,
        documentId: docs[0].id,
        teamId: user.teamId,
      }),
      buildPin({
        createdById: user.id,
        documentId: docs[1].id,
        teamId: user.teamId,
      }),
    ]);
  });

  it("should fail with status 401 unauthorized when user token is missing", async () => {
    const res = await server.post("/api/pins.list", {
      body: {},
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body.message).toEqual("Authentication required");
  });

  it("should succeed with status 200 ok returning pinned documents", async () => {
    const res = await server.post("/api/pins.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toBeTruthy();
    expect(body.data.pins).toBeTruthy();
    expect(body.data.pins).toHaveLength(2);
    const pinIds = body.data.pins.map((p: any) => p.id);
    expect(pinIds).toContain(pins[0].id);
    expect(pinIds).toContain(pins[1].id);
    const docIds = body.data.documents.map((d: any) => d.id);
    expect(docIds).toContain(docs[0].id);
    expect(docIds).toContain(docs[1].id);
  });

  it("should succeed with status 200 ok returning pinned documents filtered by collectionId supplied", async () => {
    const res = await server.post("/api/pins.list", {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toBeTruthy();
    expect(body.data.pins).toBeTruthy();
    expect(body.data.pins).toHaveLength(0);
  });
});

describe("#pins.update", () => {
  let user: User;
  let admin: User;
  let pin: Pin;

  beforeEach(async () => {
    user = await buildUser();
    admin = await buildAdmin();
    const collection = await buildCollection({
      createdById: admin.id,
      teamId: admin.teamId,
    });
    const doc = await buildDocument({
      createdById: admin.id,
      teamId: admin.teamId,
      collectionId: collection.id,
    });
    pin = await buildPin({
      teamId: admin.teamId,
      createdById: admin.id,
      documentId: doc.id,
      index: "a",
    });
  });

  it("should fail with status 401 unauthorized when user token is missing", async () => {
    const res = await server.post("/api/pins.update", {
      body: {
        id: pin.id,
        index: "i",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body.message).toEqual("Authentication required");
  });

  it("should fail with status 400 bad request when id is missing", async () => {
    const res = await server.post("/api/pins.update", {
      body: {
        token: admin.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id: Required");
  });

  it("should fail with status 400 bad request when index is missing", async () => {
    const res = await server.post("/api/pins.update", {
      body: {
        token: admin.getJwtToken(),
        id: pin.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("index: Required");
  });

  it("should fail with status 400 bad request when an invalid index is sent", async () => {
    const res = await server.post("/api/pins.update", {
      body: {
        token: admin.getJwtToken(),
        id: pin.id,
        index: "😀",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("index: must be between x20 to x7E ASCII");
  });

  it("should fail with status 403 forbidden when user is disallowed to update the pin", async () => {
    const res = await server.post("/api/pins.update", {
      body: {
        token: user.getJwtToken(),
        id: pin.id,
        index: "b",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Authorization error");
  });

  it("should succeed with status 200 ok and when user is allowed to update the pin", async () => {
    const res = await server.post("/api/pins.update", {
      body: {
        token: admin.getJwtToken(),
        id: pin.id,
        index: "b",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toBeTruthy();
    expect(body.data.id).toEqual(pin.id);
    expect(body.data.index).toEqual("b");
  });
});

describe("#pins.delete", () => {
  let admin: User;
  let pin: Pin;

  beforeEach(async () => {
    admin = await buildAdmin();
    pin = await buildPin({
      teamId: admin.teamId,
      createdById: admin.id,
    });
  });

  it("should fail with status 401 unauthorized when user token is missing", async () => {
    const res = await server.post("/api/pins.delete", {
      body: {},
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body.message).toEqual("Authentication required");
  });

  it("should fail with status 400 bad request when id is missing", async () => {
    const res = await server.post("/api/pins.delete", {
      body: {
        token: admin.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id: Required");
  });

  it("should fail with status 403 forbidden when user is disallowed to delete the pin", async () => {
    const user = await buildUser({
      teamId: admin.teamId,
    });
    const res = await server.post("/api/pins.delete", {
      body: {
        token: user.getJwtToken(),
        id: pin.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Authorization error");
  });

  it("should succeed with status 200 ok when user is allowed to delete the pin", async () => {
    const res = await server.post("/api/pins.delete", {
      body: {
        token: admin.getJwtToken(),
        id: pin.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });
});
