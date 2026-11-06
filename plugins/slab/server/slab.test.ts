import { ImportState, IntegrationService } from "@shared/types";
import { buildAdmin, buildAttachment } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#imports.create", () => {
  it("should create a slab import from an uploaded file", async () => {
    const admin = await buildAdmin();
    const attachment = await buildAttachment({
      teamId: admin.teamId,
      userId: admin.id,
    });

    const res = await server.post("/api/imports.create", admin, {
      body: {
        attachmentId: attachment.id,
        service: IntegrationService.Slab,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.state).toEqual(ImportState.Created);
    expect(body.data.service).toEqual(IntegrationService.Slab);
  });
});
