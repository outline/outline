import { faker } from "@faker-js/faker";
import { buildUser, buildTeam } from "@server/test/factories";
import { getTestServer, setSelfHosted } from "@server/test/support";

setSelfHosted();
const server = getTestServer();

describe("installation.create", () => {
  it("should create a team when no teams exist", async () => {
    const res = await server.post("/api/installation.create", {
      body: {
        teamName: faker.company.name(),
        userName: faker.person.fullName(),
        userEmail: faker.internet.email(),
      },
      redirect: "manual",
    });
    expect(res.headers.get("location")).not.toBeNull();
    expect(res.status).toEqual(302);
  });

  it("should fail when teams already exist", async () => {
    await buildTeam();

    const res = await server.post("/api/installation.create", {
      body: {
        teamName: faker.company.name(),
        userName: faker.person.fullName(),
        userEmail: faker.internet.email(),
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
