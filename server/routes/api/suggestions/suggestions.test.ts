import { buildGroup, buildGuestUser, buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#suggestions.mention", () => {
  it("should return users and groups in the team", async () => {
    const user = await buildUser();
    const other = await buildUser({ teamId: user.teamId, name: "Elizabeth" });
    const group = await buildGroup({ teamId: user.teamId, name: "Elephants" });

    const res = await server.post("/api/suggestions.mention", user);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.users.map((u: { id: string }) => u.id)).toContain(
      other.id
    );
    expect(body.data.groups.map((g: { id: string }) => g.id)).toContain(
      group.id
    );
  });

  it("should not return users or groups for a guest", async () => {
    const user = await buildUser();
    await buildUser({ teamId: user.teamId, name: "Elizabeth" });
    await buildGroup({ teamId: user.teamId, name: "Elephants" });
    const guest = await buildGuestUser({ teamId: user.teamId });

    const res = await server.post("/api/suggestions.mention", guest);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.users).toEqual([]);
    expect(body.data.groups).toEqual([]);
  });

  it("should not allow a guest to probe for users by email", async () => {
    const user = await buildUser();
    const other = await buildUser({ teamId: user.teamId });
    const guest = await buildGuestUser({ teamId: user.teamId });

    const res = await server.post("/api/suggestions.mention", guest, {
      body: { query: other.email },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.users).toEqual([]);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/suggestions.mention");
    expect(res.status).toEqual(401);
  });
});
