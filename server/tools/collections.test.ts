import { Collection } from "@server/models";
import { buildCollection, buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import {
  buildOAuthUser,
  callMcpTool,
  parseMcpListContent,
} from "@server/test/McpHelper";

const server = getTestServer();

describe("collection tools", () => {
  it("list_collections returns user collections", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await callMcpTool(server, accessToken, "list_collections");
    const data = parseMcpListContent<{ id: string; url: string }>(
      res?.result?.content
    );

    expect(data.length).toBeGreaterThanOrEqual(1);
    const ids = data.map((c) => c.id);
    expect(ids).toContain(collection.id);

    const match = data.find((c) => c.id === collection.id);
    expect(match).toBeDefined();
    expect(match!.url).toMatch(/^https?:\/\//);
  });

  it("list_collections filters by name ignoring case", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      name: "Product Design",
      teamId: user.teamId,
      userId: user.id,
    });
    const other = await buildCollection({
      name: "Something else",
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await callMcpTool(server, accessToken, "list_collections", {
      query: "duct des",
    });
    const data = parseMcpListContent<{ id: string }>(res?.result?.content);

    const ids = data.map((c) => c.id);
    expect(ids).toContain(collection.id);
    expect(ids).not.toContain(other.id);
  });

  it("list_collections does not return collections from another team", async () => {
    const { accessToken } = await buildOAuthUser();
    const otherUser = await buildUser();
    const otherCollection = await buildCollection({
      teamId: otherUser.teamId,
      userId: otherUser.id,
    });

    const res = await callMcpTool(server, accessToken, "list_collections");
    const data = parseMcpListContent<{ id: string }>(res?.result?.content);

    const ids = data.map((c: { id: string }) => c.id);
    expect(ids).not.toContain(otherCollection.id);
  });

  it("create_collection creates with name, description, icon, color", async () => {
    const { accessToken } = await buildOAuthUser();

    const res = await callMcpTool(server, accessToken, "create_collection", {
      name: "Test Collection",
      description: "A **test** description",
      icon: "rocket",
      color: "#FF0000",
    });
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.success).toBe(true);
    expect(data.name).toEqual("Test Collection");
    expect(data.id).toBeDefined();
    expect(data.url).toMatch(/^https?:\/\//);

    const collection = await Collection.findByPk(data.id, {
      rejectOnEmpty: true,
    });
    expect(collection.description).toEqual("A **test** description");
    expect(collection.icon).toEqual("rocket");
    expect(collection.color).toEqual("#FF0000");
    expect(collection.permission).toEqual(null);
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

    expect(data.success).toBe(true);
    expect(data.name).toEqual("Updated Name");
    expect(data.url).toMatch(/^https?:\/\//);

    await collection.reload();
    expect(collection.description).toEqual("Updated description");
  });

  it("update_collection errors when no fields are provided to update", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await callMcpTool(server, accessToken, "update_collection", {
      id: collection.id,
    });

    expect(res?.result?.isError).toBe(true);
    expect(res?.result?.content?.[0]?.text).toContain(
      "The update resulted in no changes to the collection"
    );
  });

  it("update_collection errors when provided fields are identical to the current collection", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await callMcpTool(server, accessToken, "update_collection", {
      id: collection.id,
      name: collection.name,
    });

    expect(res?.result?.isError).toBe(true);
    expect(res?.result?.content?.[0]?.text).toContain(
      "The update resulted in no changes to the collection"
    );
  });
});
