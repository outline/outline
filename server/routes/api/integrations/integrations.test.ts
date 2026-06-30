import type { IntegrationSettings } from "@shared/types";
import { IntegrationService, IntegrationType } from "@shared/types";
import type { User } from "@server/models";
import Integration from "@server/models/Integration";
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

    const res = await server.post("/api/integrations.update", user, {
      body: {
        events: ["documents.update"],
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
    const res = await server.post("/api/integrations.update", user, {
      body: {
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

    const res = await server.post("/api/integrations.update", admin, {
      body: {
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

    const res = await server.post("/api/integrations.update", admin, {
      body: {
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

    const res = await server.post("/api/integrations.create", admin, {
      body: {
        type: IntegrationType.Embed,
        service: IntegrationService.Diagrams,
        settings: { url: "not a url" },
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("url: Invalid URL");
  });

  it("should succeed with status 200 ok for an integration without url", async () => {
    const admin = await buildAdmin();

    const res = await server.post("/api/integrations.create", admin, {
      body: {
        type: IntegrationType.Analytics,
        service: IntegrationService.GoogleAnalytics,
        settings: { measurementId: "123" },
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.type).toEqual(IntegrationType.Analytics);
    expect(body.data.service).toEqual(IntegrationService.GoogleAnalytics);
    expect(body.data.settings).not.toBeFalsy();
    expect(body.data.settings.measurementId).toEqual("123");
  });

  it("should succeed with status 200 ok for an grist integration", async () => {
    const admin = await buildAdmin();

    const res = await server.post("/api/integrations.create", admin, {
      body: {
        type: IntegrationType.Embed,
        service: IntegrationService.Grist,
        settings: { url: "https://grist.example.com" },
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.type).toEqual(IntegrationType.Embed);
    expect(body.data.service).toEqual(IntegrationService.Grist);
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

    const res = await server.post("/api/integrations.delete", user, {
      body: {
        id: integration.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should fail with status 400 bad request when id is not sent", async () => {
    const res = await server.post("/api/integrations.delete", admin);

    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual(
      "id: Invalid input: expected string, received undefined"
    );
  });

  it("should succeed as user deleting own linked account integration", async () => {
    const user = await buildUser();
    const linkedAccount = await buildIntegration({
      userId: user.id,
      teamId: user.teamId,
      service: IntegrationService.Slack,
      type: IntegrationType.LinkedAccount,
    });
    const res = await server.post("/api/integrations.delete", user, {
      body: {
        id: linkedAccount.id,
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should succeed with status 200 ok when integration is deleted", async () => {
    const res = await server.post("/api/integrations.delete", admin, {
      body: {
        id: integration.id,
      },
    });

    expect(res.status).toEqual(200);

    const intg = await Integration.findByPk(integration.id);
    expect(intg?.deletedAt).not.toBeNull();
  });
});

describe("#integrations.list", () => {
  it("should not expose the webhook url of post integrations", async () => {
    const admin = await buildAdmin();
    await buildIntegration({
      userId: admin.id,
      teamId: admin.teamId,
      service: IntegrationService.Slack,
      type: IntegrationType.Post,
      settings: {
        url: "https://hooks.slack.com/services/secret",
        channel: "#general",
        channelId: "C123",
      } as IntegrationSettings<IntegrationType.Post>,
    });

    const res = await server.post("/api/integrations.list", admin);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    // Only the opted-in channel field is exposed, never the webhook url.
    expect(body.data[0].settings.url).toBeUndefined();
    expect(body.data[0].settings.channel).toEqual("#general");
  });

  it("should expose the public settings of embed integrations", async () => {
    const team = await buildTeam();
    const member = await buildUser({ teamId: team.id });
    await buildIntegration({
      userId: member.id,
      teamId: team.id,
      service: IntegrationService.Diagrams,
      type: IntegrationType.Embed,
      settings: { url: "https://example.com" },
    });

    const res = await server.post("/api/integrations.list", member);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].settings.url).toEqual("https://example.com");
  });
});
