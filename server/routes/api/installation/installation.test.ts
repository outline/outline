import { buildUser, buildTeam } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("installation.create", () => {
  it("should create a team when no teams exist", async () => {
    const res = await server.post("/api/installation.create", {
      body: {
        teamName: "Test Team",
        userName: "Test User",
        userEmail: "test@example.com",
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data).not.toBeFalsy();
    expect(body.data.team).not.toBeFalsy();
    expect(body.data.user).not.toBeFalsy();
    expect(body.data.team.name).toBe("Test Team");
    expect(body.data.user.name).toBe("Test User");
    expect(body.data.user.email).toBe("test@example.com");
    expect(body.data.isNewTeam).toBe(true);
    expect(body.data.isNewUser).toBe(true);
  });

  it("should fail when teams already exist", async () => {
    await buildTeam();

    const res = await server.post("/api/installation.create", {
      body: {
        teamName: "Test Team",
        userName: "Test User",
        userEmail: "test@example.com",
      },
    });

    expect(res.status).toEqual(400);
    const body = await res.json();
    expect(body.message).toContain("Installation already has existing teams");
  });

  it("should validate required fields", async () => {
    const res = await server.post("/api/installation.create", {
      body: {
        teamName: "",
        userName: "",
        userEmail: "invalid-email",
      },
    });

    expect(res.status).toEqual(400);
  });
});

describe("installation.info", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/installation.info", {
      body: {},
    });
    expect(res.status).toEqual(401);
  });

  it("should return installation information", async () => {
    const user = await buildUser();
    const res = await server.post("/api/installation.info", {
      body: {
        token: user.getJwtToken(),
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data).not.toBeFalsy();
    expect(body.data.version).not.toBeFalsy();
    expect(body.data.latestVersion).not.toBeFalsy();
    expect(typeof body.data.versionsBehind).toBe("number");
    expect(body.policies).not.toBeFalsy();
  });
});
