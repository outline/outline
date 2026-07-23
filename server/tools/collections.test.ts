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
    expect(data.permission).toEqual(null);
    expect(data.description).toEqual("A test description");
    expect(data.data).toBeUndefined();
  });

  it("returns the description as markdown, not ProseMirror JSON", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      description: "Hello, `world`!",
    });

    const res = await callMcpTool(server, accessToken, "list_collections");
    const data = parseMcpListContent<{
      id: string;
      description?: string;
      data?: unknown;
    }>(res?.result?.content);

    const match = data.find((c) => c.id === collection.id);
    expect(match).toBeDefined();
    expect(match!.description).toEqual("Hello, `world`!");
    expect(match!.data).toBeUndefined();
  });

  it("treats an empty responseFormat as omitted", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      description: "Hello, `world`!",
    });

    const res = await callMcpTool(server, accessToken, "list_collections", {
      responseFormat: "",
    });
    const data = parseMcpListContent<{ id: string; description?: string }>(
      res?.result?.content
    );

    const match = data.find((c) => c.id === collection.id);
    expect(res?.result?.isError).toBeFalsy();
    expect(match!.description).toEqual("Hello, `world`!");
  });

  it("returns ProseMirror JSON when responseFormat is json", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      description: "Hello, `world`!",
    });

    const res = await callMcpTool(server, accessToken, "list_collections", {
      responseFormat: "json",
    });
    const data = parseMcpListContent<{
      id: string;
      description?: string;
      data?: { type: string };
    }>(res?.result?.content);

    const match = data.find((c) => c.id === collection.id);
    expect(match).toBeDefined();
    expect(match!.data?.type).toEqual("doc");
    // The markdown description is kept — update_collection has no `data`
    // input, so it is the only representation that can be written back.
    expect(match!.description).toEqual("Hello, `world`!");
  });

  it("returns the description verbatim rather than re-escaped markdown", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      description: "Rates: 5 * 3 and C:\\Users\\foo",
    });

    const res = await callMcpTool(server, accessToken, "list_collections");
    const data = parseMcpListContent<{ id: string; description?: string }>(
      res?.result?.content
    );

    // Round-tripping through the markdown serializer would return
    // "5 \\* 3" and "C:\\\\Users", which a caller echoing the value back into
    // update_collection would persist.
    const match = data.find((c) => c.id === collection.id);
    expect(match!.description).toEqual("Rates: 5 * 3 and C:\\Users\\foo");
  });

  it("keeps description present when it is empty, so a cleared value is distinguishable", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      description: null,
    });

    const res = await callMcpTool(server, accessToken, "list_collections");
    const data = parseMcpListContent<{ id: string; description?: string }>(
      res?.result?.content
    );

    const match = data.find((c) => c.id === collection.id);
    expect(match).toHaveProperty("description");
    expect(match!.description).toEqual("");
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
