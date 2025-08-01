import { faker } from "@faker-js/faker";
import { sequelize } from "@server/storage/database";
import { buildUser, buildTeam } from "@server/test/factories";
import { getTestServer, setSelfHosted } from "@server/test/support";

setSelfHosted();
const server = getTestServer();

describe("installation.create", () => {
  // Skipped in CI because tests run in parallel and this requires a clean database state.
  it.skip("should create a team when no teams exist", async () => {
    await sequelize.query(
      "TRUNCATE TABLE teams, users, team_domains, user_authentications RESTART IDENTITY CASCADE"
    );

    const res = await server.post("/api/installation.create", {
      body: {
        teamName: faker.company.name(),
        userName: faker.person.fullName(),
        userEmail: faker.internet.email().toLowerCase(),
      },
      redirect: "manual",
    });
    expect(res.status).toEqual(302);
    expect(res.headers.get("location")).not.toBeNull();
  });

  it("should fail when teams already exist", async () => {
    await buildTeam();

    const res = await server.post("/api/installation.create", {
      body: {
        teamName: faker.company.name(),
        userName: faker.person.fullName(),
        userEmail: faker.internet.email().toLowerCase(),
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
  it.skip("should require authentication", async () => {
    const res = await server.post("/api/installation.info", {
      body: {},
    });
    expect(res.status).toEqual(401);
  });

  it.skip("should return installation information", async () => {
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
