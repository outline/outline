import { IntegrationService, IntegrationType } from "@shared/types";
import { buildAdmin } from "@server/test/factories";
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
