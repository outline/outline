import { isUndefined, uniq } from "lodash";
import { IntegrationType } from "@shared/types";
import { User } from "@server/models";
import { UserCreatableIntegrationService } from "@server/models/Integration";
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

  it("should succeed with status 200 ok but not return authToken in response when the user is not an admin", async () => {
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
    expect(
      body.data.filter((d: any) => !isUndefined(d.authToken))
    ).toHaveLength(0);
  });

  it("should succeed with status 200 ok and return authToken in response when the user is an admin", async () => {
    const res = await server.post("/api/integrations.list", {
      body: {
        token: admin.getJwtToken(),
      },
    });

    const body = await res.json();
    expect(body.data).toHaveLength(2);
    const integrations = body.data.filter(
      (d: any) => !isUndefined(d.authToken)
    );
    expect(integrations).toHaveLength(1);
    expect(integrations[0].authToken).toBe("token");
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

describe("#integrations.create", () => {
  it("should fail with status 400 bad request for an invalid url value supplied in settings param", async () => {
    const admin = await buildAdmin();

    const res = await server.post("/api/integrations.create", {
      body: {
        token: admin.getJwtToken(),
        type: IntegrationType.Embed,
        service: UserCreatableIntegrationService.Diagrams,
        settings: { url: "not a url" },
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("url: Invalid url");
  });

  it("should fail with status 403 unauthorized when the user is not an admin", async () => {
    const user = await buildUser();

    const res = await server.post("/api/integrations.create", {
      body: {
        token: user.getJwtToken(),
        type: IntegrationType.Embed,
        service: UserCreatableIntegrationService.Diagrams,
        settings: { url: "https://example.com" },
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Admin role required");
  });

  it("should succeed with status 200 ok when integration authToken is not supplied", async () => {
    const admin = await buildAdmin();

    const res = await server.post("/api/integrations.create", {
      body: {
        token: admin.getJwtToken(),
        type: IntegrationType.Embed,
        service: UserCreatableIntegrationService.Diagrams,
        settings: { url: "https://example.com" },
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.userId).toEqual(admin.id);
    expect(body.data.teamId).toEqual(admin.teamId);
    expect(body.data.type).toEqual(IntegrationType.Embed);
    expect(body.data.service).toEqual(UserCreatableIntegrationService.Diagrams);
    expect(body.data.authenticationId).toBeNull();
    expect(body.data.authToken).toBeUndefined();
    expect(body.data.settings.url).toEqual("https://example.com");
  });

  it("should succeed with status 200 ok when integration authToken is supplied", async () => {
    const admin = await buildAdmin();

    const res = await server.post("/api/integrations.create", {
      body: {
        token: admin.getJwtToken(),
        type: IntegrationType.Embed,
        service: UserCreatableIntegrationService.Diagrams,
        settings: { url: "https://example.com" },
        authToken: "token",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.userId).toEqual(admin.id);
    expect(body.data.teamId).toEqual(admin.teamId);
    expect(body.data.type).toEqual(IntegrationType.Embed);
    expect(body.data.service).toEqual(UserCreatableIntegrationService.Diagrams);
    expect(body.data.authenticationId).not.toBeNull();
    expect(body.data.authToken).toEqual("token");
    expect(body.data.settings.url).toEqual("https://example.com");
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
