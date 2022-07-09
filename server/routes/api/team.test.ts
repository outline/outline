import TestServer from "fetch-test-server";
import { TeamDomain } from "@server/models";
import webService from "@server/services/web";
import { buildAdmin, buildCollection, buildTeam } from "@server/test/factories";
import { flushdb, seed } from "@server/test/support";

const app = webService();
const server = new TestServer(app.callback());
beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#team.update", () => {
  it("should update team details", async () => {
    const { admin } = await seed();
    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        name: "New name",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("New name");
  });

  it("should add new allowed Domains, removing empty string values", async () => {
    const { admin, team } = await seed();
    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        allowedDomains: [
          "example-company.com",
          "",
          "example-company.org",
          "",
          "",
        ],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.allowedDomains.sort()).toEqual([
      "example-company.com",
      "example-company.org",
    ]);

    const teamDomains: TeamDomain[] = await TeamDomain.findAll({
      where: { teamId: team.id },
    });
    expect(teamDomains.map((d) => d.name).sort()).toEqual([
      "example-company.com",
      "example-company.org",
    ]);
  });

  it("should remove old allowed Domains", async () => {
    const { admin, team } = await seed();
    const existingTeamDomain = await TeamDomain.create({
      teamId: team.id,
      name: "example-company.com",
      createdById: admin.id,
    });

    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        allowedDomains: [],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.allowedDomains).toEqual([]);

    const teamDomains: TeamDomain[] = await TeamDomain.findAll({
      where: { teamId: team.id },
    });
    expect(teamDomains.map((d) => d.name)).toEqual([]);

    expect(await TeamDomain.findByPk(existingTeamDomain.id)).toBeNull();
  });

  it("should add new allowed domains and remove old ones", async () => {
    const { admin, team } = await seed();
    const existingTeamDomain = await TeamDomain.create({
      teamId: team.id,
      name: "example-company.com",
      createdById: admin.id,
    });

    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        allowedDomains: ["example-company.org", "example-company.net"],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.allowedDomains.sort()).toEqual([
      "example-company.net",
      "example-company.org",
    ]);

    const teamDomains: TeamDomain[] = await TeamDomain.findAll({
      where: { teamId: team.id },
    });
    expect(teamDomains.map((d) => d.name).sort()).toEqual(
      ["example-company.org", "example-company.net"].sort()
    );

    expect(await TeamDomain.findByPk(existingTeamDomain.id)).toBeNull();
  });

  it("should only allow member,viewer or admin as default role", async () => {
    const { admin } = await seed();
    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        defaultUserRole: "New name",
      },
    });
    expect(res.status).toEqual(400);
    const successRes = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        defaultUserRole: "viewer",
      },
    });
    const body = await successRes.json();
    expect(successRes.status).toEqual(200);
    expect(body.data.defaultUserRole).toBe("viewer");
  });

  it("should allow identical team details", async () => {
    const { admin, team } = await seed();
    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        name: team.name,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual(team.name);
  });

  it("should require admin", async () => {
    const { user } = await seed();
    const res = await server.post("/api/team.update", {
      body: {
        token: user.getJwtToken(),
        name: "New name",
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    await seed();
    const res = await server.post("/api/team.update");
    expect(res.status).toEqual(401);
  });

  it("should update default collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: admin.id,
    });

    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        defaultCollectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.defaultCollectionId).toEqual(collection.id);
  });

  it("should default to home if default collection is deleted", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: admin.id,
    });

    await buildCollection({
      teamId: team.id,
      userId: admin.id,
    });

    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        defaultCollectionId: collection.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.defaultCollectionId).toEqual(collection.id);

    const deleteRes = await server.post("/api/collections.delete", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
      },
    });
    expect(deleteRes.status).toEqual(200);

    const res3 = await server.post("/api/auth.info", {
      body: {
        token: admin.getJwtToken(),
      },
    });
    const body3 = await res3.json();
    expect(res3.status).toEqual(200);
    expect(body3.data.team.defaultCollectionId).toEqual(null);
  });

  it("should update default collection to null when collection is made private", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: admin.id,
    });

    await buildCollection({
      teamId: team.id,
      userId: admin.id,
    });

    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        defaultCollectionId: collection.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.defaultCollectionId).toEqual(collection.id);

    const updateRes = await server.post("/api/collections.update", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        permission: "",
      },
    });

    expect(updateRes.status).toEqual(200);

    const res3 = await server.post("/api/auth.info", {
      body: {
        token: admin.getJwtToken(),
      },
    });
    const body3 = await res3.json();
    expect(res3.status).toEqual(200);
    expect(body3.data.team.defaultCollectionId).toEqual(null);
  });
});
