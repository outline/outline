// @flow
import TestServer from "fetch-test-server";
import app from "../app";
import { buildUser, buildTeam } from "../test/factories";
import { flushdb } from "../test/support";

const server = new TestServer(app.callback());

beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#authenticationProviders.list", () => {
  it("should return available auth providers", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    const res = await server.post("/api/auth.info", {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.user.name).toBe(user.name);
  });
});
