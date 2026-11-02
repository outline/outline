import { IntegrationService, IntegrationType } from "@shared/types";
import {
  buildAdmin,
  buildGuestUser,
  buildIntegration,
  buildTeam,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#integrations.create", () => {
  it("should accept the settings of a diagrams integration", async () => {
    const admin = await buildAdmin();

    const res = await server.post("/api/integrations.create", admin, {
      body: {
        type: IntegrationType.Embed,
        service: IntegrationService.Diagrams,
        settings: { diagrams: { url: "https://diagrams.example.com/" } },
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.settings).toEqual({
      diagrams: { url: "https://diagrams.example.com/" },
    });
  });

  it("should fail with status 400 bad request for invalid diagrams settings", async () => {
    const admin = await buildAdmin();

    const res = await server.post("/api/integrations.create", admin, {
      body: {
        type: IntegrationType.Embed,
        service: IntegrationService.Diagrams,
        settings: { diagrams: { url: "not a url" } },
      },
    });
    expect(res.status).toEqual(400);
  });
});

describe("#integrations.list", () => {
  it("should expose diagrams settings to guests", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const guest = await buildGuestUser({ teamId: team.id });
    await buildIntegration({
      userId: admin.id,
      teamId: team.id,
      service: IntegrationService.Diagrams,
      type: IntegrationType.Embed,
      settings: { diagrams: { url: "https://diagrams.example.com/" } },
    });

    const res = await server.post("/api/integrations.list", guest);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data[0].settings).toEqual({
      diagrams: { url: "https://diagrams.example.com/" },
    });
  });
});
