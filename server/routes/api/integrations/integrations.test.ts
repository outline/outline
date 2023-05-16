import { isUndefined, uniq } from "lodash";
import { IntegrationType } from "@shared/types";
import { User } from "@server/models";
import {
  buildAdmin,
  buildTeam,
  buildUser,
  buildIntegration,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#integrations.list", () => {
  let admin: User;

  beforeEach(async () => {
    admin = await buildAdmin();
    const anotherAdmin = await buildAdmin();
    await Promise.all([
      buildIntegration({
        userId: admin.id,
        teamId: admin.teamId,
        type: IntegrationType.Embed,
      }),
      buildIntegration({
        auth: true,
        userId: admin.id,
        teamId: admin.teamId,
        token: "token",
      }),
      buildIntegration({
        userId: anotherAdmin.id,
        teamId: anotherAdmin.teamId,
      }),
      buildIntegration({
        auth: true,
        userId: anotherAdmin.id,
        teamId: anotherAdmin.teamId,
        token: "token",
      }),
    ]);
  });

  it("should fail with status 400 bad request for an invalid sort param value", async () => {
    const res = await server.post("/api/integrations.list", {
      body: {
        token: admin.getJwtToken(),
        sort: "anysort",
      },
    });

    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.message).toBe("sort: Invalid sort parameter");
  });

  it("should fail with status 400 bad request for an invalid type param value", async () => {
    const res = await server.post("/api/integrations.list", {
      body: {
        token: admin.getJwtToken(),
        type: "anytype",
      },
    });

    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.message).toContain("type: Invalid enum value");
  });

  it("should succeed with status 200 ok but not return token in response when the user is not an admin", async () => {
    const user = await buildUser({
      teamId: admin.teamId,
    });

    const res = await server.post("/api/integrations.list", {
      body: {
        token: user.getJwtToken(),
      },
    });

    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data.filter((d: any) => !isUndefined(d.token))).toHaveLength(0);
  });

  it("should succeed with status 200 ok and return token in response when the user is an admin", async () => {
    const res = await server.post("/api/integrations.list", {
      body: {
        token: admin.getJwtToken(),
      },
    });

    const body = await res.json();
    expect(body.data).toHaveLength(2);
    const integrations = body.data.filter((d: any) => !isUndefined(d.token));
    expect(integrations).toHaveLength(1);
    expect(integrations[0].token).toBe("token");
  });

  it("should succeed with status 200 ok and only return integrations belonging to user's team", async () => {
    const user = await buildUser({
      teamId: admin.teamId,
    });

    const res = await server.post("/api/integrations.list", {
      body: {
        token: user.getJwtToken(),
      },
    });

    const body = await res.json();
    expect(body.data).toHaveLength(2);
    const teamIds = uniq(body.data.map((d: any) => d.teamId));
    expect(teamIds).toHaveLength(1);
    expect(teamIds[0]).toBe(user.teamId);
  });

  it("should succeed with status 200 ok and only return integrations of the requested type", async () => {
    const user = await buildUser({
      teamId: admin.teamId,
    });

    const res = await server.post("/api/integrations.list", {
      body: {
        token: user.getJwtToken(),
        type: IntegrationType.Embed,
      },
    });

    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].type).toBe(IntegrationType.Embed);
  });
});

describe("#integrations.update", () => {
  it("should allow updating integration events", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    const integration = await buildIntegration({
      userId: user.id,
      teamId: team.id,
    });

    const res = await server.post("/api/integrations.update", {
      body: {
        events: ["documents.update"],
        token: user.getJwtToken(),
        id: integration.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(integration.id);
    expect(body.data.events.length).toEqual(1);
  });

  it("should require authorization", async () => {
    const user = await buildUser();
    const integration = await buildIntegration({
      userId: user.id,
    });
    const res = await server.post("/api/integrations.update", {
      body: {
        token: user.getJwtToken(),
        id: integration.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});
