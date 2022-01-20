import TestServer from "fetch-test-server";
import webService from "@server/services/web";
import { buildUser, buildStar, buildDocument } from "@server/test/factories";
import { flushdb } from "@server/test/support";

const app = webService();
const server = new TestServer(app.callback());
beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#stars.create", () => {
  it("should create a star", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/stars.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.documentId).toEqual(document.id);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/stars.create");
    expect(res.status).toEqual(401);
  });
});

describe("#stars.list", () => {
  it("should list users stars", async () => {
    const user = await buildUser();

    await buildStar();

    const star = await buildStar({
      userId: user.id,
    });

    const res = await server.post("/api/stars.list", {
      body: {
        token: user.getJwtToken(),
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.stars.length).toEqual(1);
    expect(body.data.stars[0].id).toEqual(star.id);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/stars.list");
    expect(res.status).toEqual(401);
  });
});

describe("#stars.delete", () => {
  it("should delete users star", async () => {
    const user = await buildUser();
    const star = await buildStar({
      userId: user.id,
    });

    const res = await server.post("/api/stars.delete", {
      body: {
        id: star.id,
        token: user.getJwtToken(),
      },
    });

    expect(res.status).toEqual(200);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/stars.delete");
    expect(res.status).toEqual(401);
  });
});
