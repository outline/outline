import { IntegrationType } from "@shared/types";
import { UserCreatableIntegrationService } from "@server/models/Integration";
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
});
