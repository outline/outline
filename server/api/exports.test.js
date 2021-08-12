/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from "fetch-test-server";
import app from "../app";
import {
  buildAdmin,
  buildExport,
  buildTeam,
  buildUser,
} from "../test/factories";
import { flushdb } from "../test/support";

const server = new TestServer(app.callback());

beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#exports.list", () => {
  it("should return exports list", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const exportData = await buildExport({ teamId: team.id, userId: admin.id });

    const res = await server.post("/api/exports.list", {
      body: {
        token: admin.getJwtToken(),
      },
    });

    const body = await res.json();
    const data = body.data[0];

    expect(res.status).toEqual(200);
    expect(body.data.length).toBe(1);
    expect(data.id).toBe(exportData.id);
    expect(data.key).toBe(exportData.key);
    expect(data.url).toBe(exportData.url);
  });

  it("should require authorization", async () => {
    const user = await buildUser();

    const res = await server.post("/api/exports.list", {
      body: { token: user.getJwtToken() },
    });

    expect(res.status).toEqual(403);
  });
});
