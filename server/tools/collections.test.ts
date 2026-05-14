import { buildCollection, buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { buildOAuthUser, callMcpTool } from "@server/test/McpHelper";

const server = getTestServer();

describe("collection tools", () => {
  it("list_collections returns user collections", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await callMcpTool(server, accessToken, "list_collections");
    const data = (res?.result?.content ?? []).map((c: { text: string }) =>
      JSON.parse(c.text)
    );

    expect(data.length).toBeGreaterThanOrEqual(1);
    const ids = data.map((c: { id: string }) => c.id);
    expect(ids).toContain(collection.id);

    const match = data.find((c: { id: string }) => c.id === collection.id) as {
      url: string;
    };
    expect(match.url).toMatch(/^https?:\/\//);
  });

  it("list_collections does not return collections from another team", async () => {
    const { accessToken } = await buildOAuthUser();
    const otherUser = await buildUser();
    const otherCollection = await buildCollection({
      teamId: otherUser.teamId,
      userId: otherUser.id,
    });

    const res = await callMcpTool(server, accessToken, "list_collections");
    const data = (res?.result?.content ?? []).map((c: { text: string }) =>
      JSON.parse(c.text)
    );

    const ids = data.map((c: { id: string }) => c.id);
    expect(ids).not.toContain(otherCollection.id);
  });

  it("create_collection creates with name, description, icon, color", async () => {
    const { accessToken } = await buildOAuthUser();

    const res = await callMcpTool(server, accessToken, "create_collection", {
      name: "Test Collection",
      description: "A test description",
      icon: "rocket",
      color: "#FF0000",
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.name).toEqual("Test Collection");
    expect(data.icon).toEqual("rocket");
    expect(data.color).toEqual("#FF0000");
    expect(data.id).toBeDefined();
    expect(data.url).toMatch(/^https?:\/\//);
  });

  it("update_collection updates fields on existing collection", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await callMcpTool(server, accessToken, "update_collection", {
      id: collection.id,
      name: "Updated Name",
      description: "Updated description",
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.name).toEqual("Updated Name");
    expect(data.url).toMatch(/^https?:\/\//);
  });
});
