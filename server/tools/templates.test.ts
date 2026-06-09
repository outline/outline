import { Scope } from "@shared/types";
import {
  buildUser,
  buildCollection,
  buildTemplate,
  buildOAuthAuthentication,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { buildOAuthUser, callMcpTool } from "@server/test/McpHelper";

const server = getTestServer();

describe("list_templates", () => {
  it("returns workspace and collection templates the user can access", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const workspaceTemplate = await buildTemplate({
      teamId: user.teamId,
      userId: user.id,
      collectionId: null,
      text: "Body of the workspace template",
    });
    const collectionTemplate = await buildTemplate({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });

    const res = await callMcpTool(server, accessToken, "list_templates");
    const data = (res?.result?.content ?? []).map((c: { text?: string }) =>
      JSON.parse(c.text ?? "{}")
    );

    const ids = data.map((t: { id: string }) => t.id);
    expect(ids).toContain(workspaceTemplate.id);
    expect(ids).toContain(collectionTemplate.id);

    const match = data.find(
      (t: { id: string }) => t.id === workspaceTemplate.id
    ) as { url: string; collectionId: string | null; text: string };
    expect(match.url).toMatch(/^https?:\/\//);
    expect(match.collectionId).toBeNull();
    expect(match.text).toContain("Body of the workspace template");
  });

  it("filters by collection", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection1 = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const collection2 = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const template1 = await buildTemplate({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection1.id,
    });
    await buildTemplate({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection2.id,
    });

    const res = await callMcpTool(server, accessToken, "list_templates", {
      collectionId: collection1.id,
    });
    const data = (res?.result?.content ?? []).map((c: { text?: string }) =>
      JSON.parse(c.text ?? "{}")
    );

    const ids = data.map((t: { id: string }) => t.id);
    expect(ids).toContain(template1.id);
    expect(
      data.every(
        (t: { collectionId: string }) => t.collectionId === collection1.id
      )
    ).toBe(true);
  });

  it("does not return templates from collections the user cannot access", async () => {
    const owner = await buildUser();
    const otherUser = await buildUser({ teamId: owner.teamId });

    const privateCollection = await buildCollection({
      teamId: owner.teamId,
      userId: owner.id,
      permission: null,
    });
    const privateTemplate = await buildTemplate({
      teamId: owner.teamId,
      userId: owner.id,
      collectionId: privateCollection.id,
    });

    const auth = await buildOAuthAuthentication({
      user: otherUser,
      scope: [Scope.Read],
    });

    const res = await callMcpTool(server, auth.accessToken!, "list_templates");
    const data = (res?.result?.content ?? []).map((c: { text?: string }) =>
      JSON.parse(c.text ?? "{}")
    );
    const ids = data.map((t: { id: string }) => t.id);

    expect(res?.result?.isError).not.toBe(true);
    expect(ids).not.toContain(privateTemplate.id);
  });
});
