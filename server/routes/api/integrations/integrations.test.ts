import { IntegrationService, IntegrationType } from "@shared/types";
import { IntegrationAuthentication, User } from "@server/models";
import Integration, {
  UserCreatableIntegrationService,
} from "@server/models/Integration";
import {
  buildAdmin,
  buildTeam,
  buildUser,
  buildIntegration,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

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

  it("should succeed with status 200 ok when diagram integration settings are updated", async () => {
    const admin = await buildAdmin();

    const integration = await buildIntegration({
      userId: admin.id,
      teamId: admin.teamId,
      service: IntegrationService.Diagrams,
      type: IntegrationType.Embed,
      settings: { url: "https://example.com" },
    });

    const res = await server.post("/api/integrations.update", {
      body: {
        token: admin.getJwtToken(),
        id: integration.id,
        settings: { url: "https://foo.bar" },
      },
    });

    const body = await res.json();
    expect(body.data.id).toEqual(integration.id);
    expect(body.data.settings.url).toEqual("https://foo.bar");
  });

  it("should succeed with status 200 ok when grist integration settings are updated", async () => {
    const admin = await buildAdmin();

    const integration = await buildIntegration({
      userId: admin.id,
      teamId: admin.teamId,
      service: IntegrationService.Grist,
      type: IntegrationType.Embed,
      settings: { url: "https://example.com" },
    });

    const res = await server.post("/api/integrations.update", {
      body: {
        token: admin.getJwtToken(),
        id: integration.id,
        settings: { url: "https://grist.example.com" },
      },
    });

    const body = await res.json();
    expect(body.data.id).toEqual(integration.id);
    expect(body.data.settings.url).toEqual("https://grist.example.com");
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

  it("should succeed with status 200 ok for an integration without url", async () => {
    const admin = await buildAdmin();

    const res = await server.post("/api/integrations.create", {
      body: {
        token: admin.getJwtToken(),
        type: IntegrationType.Analytics,
        service: UserCreatableIntegrationService.GoogleAnalytics,
        settings: { measurementId: "123" },
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.type).toEqual(IntegrationType.Analytics);
    expect(body.data.service).toEqual(
      UserCreatableIntegrationService.GoogleAnalytics
    );
    expect(body.data.settings).not.toBeFalsy();
    expect(body.data.settings.measurementId).toEqual("123");
  });

  it("should succeed with status 200 ok for an grist integration", async () => {
    const admin = await buildAdmin();

    const res = await server.post("/api/integrations.create", {
      body: {
        token: admin.getJwtToken(),
        type: IntegrationType.Embed,
        service: UserCreatableIntegrationService.Grist,
        settings: { url: "https://grist.example.com" },
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.type).toEqual(IntegrationType.Embed);
    expect(body.data.service).toEqual(UserCreatableIntegrationService.Grist);
    expect(body.data.settings).not.toBeFalsy();
    expect(body.data.settings.url).toEqual("https://grist.example.com");
  });
});

describe("#integrations.delete", () => {
  let admin: User;
  let integration: Integration;

  beforeEach(async () => {
    admin = await buildAdmin();

    integration = await buildIntegration({
      userId: admin.id,
      teamId: admin.teamId,
      service: IntegrationService.Diagrams,
      type: IntegrationType.Embed,
      settings: { url: "https://example.com" },
    });
  });

  it("should fail with status 403 unauthorized when the user is not an admin", async () => {
    const user = await buildUser();

    const res = await server.post("/api/integrations.delete", {
      body: {
        token: user.getJwtToken(),
        id: integration.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Admin role required");
  });

  it("should fail with status 400 bad request when id is not sent", async () => {
    const res = await server.post("/api/integrations.delete", {
      body: {
        token: admin.getJwtToken(),
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id: Required");
  });

  it("should succeed with status 200 ok when integration is deleted", async () => {
    const res = await server.post("/api/integrations.delete", {
      body: {
        token: admin.getJwtToken(),
        id: integration.id,
      },
    });

    expect(res.status).toEqual(200);

    const intg = await Integration.findByPk(integration.id);
    expect(intg).toBeNull();

    const auth = await IntegrationAuthentication.findByPk(
      integration.authenticationId
    );
    expect(auth).toBeNull();
  });
});
