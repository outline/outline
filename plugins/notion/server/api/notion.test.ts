import {
  CollectionPermission,
  ImportState,
  IntegrationService,
  IntegrationType,
} from "@shared/types";
import { Integration } from "@server/models";
import {
  buildAdmin,
  buildImport,
  buildIntegration,
  buildUser,
  buildViewer,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import type { NotionImportInput } from "../../shared/schema";

const server = getTestServer();

describe("#notion.callback", () => {
  it("should reject callback when state nonce does not match cookie", async () => {
    const user = await buildUser();
    const state = JSON.stringify({
      teamId: user.teamId,
      nonce: "attacker-nonce",
    });
    const res = await server.get(
      `/api/notion.callback?state=${encodeURIComponent(state)}&code=123`,
      user,
      { redirect: "manual" }
    );
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.error).toEqual("state_mismatch");
  });

  it("should reject callback when nonce is missing from state", async () => {
    const user = await buildUser();
    const state = JSON.stringify({ teamId: user.teamId });
    const res = await server.get(
      `/api/notion.callback?state=${encodeURIComponent(state)}&code=123`,
      user,
      { redirect: "manual" }
    );
    expect(res.status).toEqual(400);
  });

  it("should fail when state is not valid JSON", async () => {
    const user = await buildUser();
    const res = await server.get(
      `/api/notion.callback?state=bad&code=123`,
      user,
      { redirect: "manual" }
    );
    expect(res.status).toEqual(400);
  });

  it.each([
    ["member", buildUser],
    ["viewer", buildViewer],
  ])("should not allow a %s to create an integration", async (_, build) => {
    const user = await build();
    const state = JSON.stringify({ teamId: user.teamId, nonce: "nonce" });
    const res = await server.get(
      `/api/notion.callback?state=${encodeURIComponent(state)}&code=123`,
      user,
      {
        redirect: "manual",
        headers: { Cookie: "notionOAuthNonce=nonce" },
      }
    );
    expect(res.status).toEqual(403);
  });
});

describe("#imports.create", () => {
  it("should create an import", async () => {
    const admin = await buildAdmin();
    const integration = await Integration.create<
      Integration<IntegrationType.Import>
    >({
      service: IntegrationService.Notion,
      type: IntegrationType.Import,
      userId: admin.id,
      teamId: admin.teamId,
      settings: {
        externalWorkspace: {
          id: "testId",
          name: "testWorkspaceName",
        },
      },
    });
    const input: NotionImportInput = [{ permission: undefined }];

    const res = await server.post("/api/imports.create", admin, {
      body: {
        integrationId: integration.id,
        service: IntegrationService.Notion,
        input,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toBeTruthy();
    expect(body.data.name).toEqual("testWorkspaceName");
    expect(body.data.state).toEqual(ImportState.Created);
    expect(body.data.service).toEqual(IntegrationService.Notion);
    expect(body.data.createdById).toEqual(admin.id);
  });

  it("should not allow more than one active import at a time", async () => {
    const admin = await buildAdmin();
    const integration = await buildIntegration({
      userId: admin.id,
      teamId: admin.teamId,
      service: IntegrationService.Notion,
      type: IntegrationType.Import,
      settings: {
        externalWorkspace: { id: "ws-1", name: "Test Workspace" },
        // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
    const input: NotionImportInput = [
      { permission: CollectionPermission.Read },
    ];
    await buildImport({
      createdById: admin.id,
      teamId: admin.teamId,
      integrationId: integration.id,
    });

    const res = await server.post("/api/imports.create", admin, {
      body: {
        integrationId: integration.id,
        service: IntegrationService.Notion,
        input,
      },
    });

    expect(res.status).toEqual(422);
  });
});
