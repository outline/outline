/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from "fetch-test-server";
import app from "../app";

import { flushdb, seed } from "../test/support";

const server = new TestServer(app.callback());

beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#team.update", () => {
  it("should update team details", async () => {
    const { admin } = await seed();
    const res = await server.post("/api/team.update", {
      body: { token: admin.getJwtToken(), name: "New name" },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("New name");
  });

  it("should allow identical team details", async () => {
    const { admin, team } = await seed();
    const res = await server.post("/api/team.update", {
      body: { token: admin.getJwtToken(), name: team.name },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual(team.name);
  });

  it("should require admin", async () => {
    const { user } = await seed();
    const res = await server.post("/api/team.update", {
      body: { token: user.getJwtToken(), name: "New name" },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    await seed();
    const res = await server.post("/api/team.update");
    expect(res.status).toEqual(401);
  });
});
