/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from "fetch-test-server";
import app from "../app";
import { buildExport, buildUser } from "../test/factories";
import { flushdb, seed } from "../test/support";

const server = new TestServer(app.callback());

beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#exports.list", () => {
  it("should return exports list", async () => {
    const { admin, team } = await seed();
    await buildExport({ teamId: team.id });

    const res = await server.post("/api/exports.list", {
      body: {
        token: admin.getJwtToken(),
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toBe(1);
  });

  it("should require authorization", async () => {
    const user = await buildUser();

    const res = await server.post("/api/exports.list", {
      body: { token: user.getJwtToken() },
    });

    expect(res.status).toEqual(403);
  });
});
