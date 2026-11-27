import { randomString } from "@shared/random";
import { CollectionPermission, Scope } from "@shared/types";
import type { User } from "@server/models";
import { View } from "@server/models";
import EmptyTrashTask from "@server/queues/tasks/EmptyTrashTask";
import {
  buildAdmin,
  buildCollection,
  buildComment,
  buildDocument,
  buildDraftDocument,
  buildOAuthAuthentication,
  buildPin,
  buildShare,
  buildStar,
  buildTeam,
  buildTemplate,
} from "@server/test/factories";
import { callMcpTool } from "@server/test/McpHelper";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

/**
 * Builds a private collection with a published, archived, deleted, draft and
 * template document, and a user that stars, views, pins, shares and comments
 * on the published document while they are a member.
 */
async function setup() {
  const team = await buildTeam();
  const owner = await buildAdmin({ teamId: team.id });
  const user = await buildAdmin({ teamId: team.id });
  const collection = await buildCollection({
    teamId: team.id,
    userId: owner.id,
    permission: null,
  });

  const res = await server.post("/api/collections.add_user", owner, {
    body: {
      id: collection.id,
      userId: user.id,
      permission: CollectionPermission.ReadWrite,
    },
  });
  expect(res.status).toEqual(200);

  const keyword = randomString(12);
  const title = (name: string) => `${name} ${keyword}`;
  const published = await buildDocument({
    teamId: team.id,
    userId: owner.id,
    collectionId: collection.id,
    title: title("Published"),
    text: keyword,
  });
  const archived = await buildDocument({
    teamId: team.id,
    userId: owner.id,
    collectionId: collection.id,
    title: title("Archived"),
    text: keyword,
    archivedAt: new Date(),
  });
  const deleted = await buildDocument({
    teamId: team.id,
    userId: owner.id,
    collectionId: collection.id,
    title: title("Deleted"),
    text: keyword,
  });
  await deleted.destroy();
  const draft = await buildDraftDocument({
    teamId: team.id,
    userId: user.id,
    collectionId: collection.id,
    title: title("Draft"),
    text: keyword,
  });
  const template = await buildTemplate({
    teamId: team.id,
    userId: owner.id,
    collectionId: collection.id,
    title: title("Template"),
  });

  await buildStar({ userId: user.id, documentId: published.id });
  await View.create({ userId: user.id, documentId: published.id });
  await buildPin({
    teamId: team.id,
    createdById: user.id,
    documentId: published.id,
    collectionId: null,
  });
  await buildComment({ userId: user.id, documentId: published.id });
  await buildShare({
    teamId: team.id,
    userId: user.id,
    documentId: published.id,
  });

  const auth = await buildOAuthAuthentication({
    user,
    scope: [Scope.Read, Scope.Write, Scope.Create],
  });

  return {
    owner,
    user,
    collection,
    keyword,
    accessToken: auth.accessToken ?? "",
    documents: [published, archived, deleted, draft, template],
  };
}

/**
 * Calls each document read endpoint and MCP tool as the user.
 *
 * @returns the serialized response of each call, by name.
 */
async function readAll({
  user,
  collection,
  keyword,
  accessToken,
  documents,
}: {
  user: User;
  collection: { id: string };
  keyword: string;
  accessToken: string;
  documents: { id: string; title: string }[];
}): Promise<Record<string, string>> {
  const [published] = documents;
  const endpoints: [string, Record<string, unknown>][] = [
    ["documents.list", {}],
    ["documents.archived", {}],
    ["documents.deleted", {}],
    ["documents.drafts", {}],
    ["documents.viewed", {}],
    ["documents.search", { query: keyword }],
    ["documents.documents", { id: published.id }],
    ["pins.list", {}],
    ["stars.list", {}],
    ["templates.list", {}],
    ["comments.list", {}],
    ["shares.list", {}],
    ["collections.documents", { id: collection.id }],
  ];
  const tools: [string, Record<string, unknown>][] = [
    ["list_documents", {}],
    ["list_documents", { query: keyword }],
    ["list_templates", {}],
    ["list_collection_documents", { collectionId: collection.id }],
    ["fetch", { resource: "collection", id: collection.id }],
  ];
  const responses: Record<string, string> = {};

  for (const [path, body] of endpoints) {
    const res = await server.post(`/api/${path}`, user, { body });
    responses[path] = JSON.stringify({
      status: res.status,
      body: await res.json(),
    });
  }

  for (const [name, args] of tools) {
    const res = await callMcpTool(server, accessToken, name, args);
    responses[`mcp:${name}:${JSON.stringify(args)}`] = JSON.stringify(res);
  }

  const schedule = vi
    .spyOn(EmptyTrashTask.prototype, "schedule")
    .mockResolvedValue(undefined as never);
  await server.post("/api/documents.empty_trash", user);
  responses["documents.empty_trash"] = JSON.stringify(schedule.mock.calls);
  schedule.mockRestore();

  return responses;
}

describe("document access gate", () => {
  it("does not return documents to a user removed from the collection", async () => {
    const fixture = await setup();
    const res = await server.post(
      "/api/collections.remove_user",
      fixture.owner,
      {
        body: { id: fixture.collection.id, userId: fixture.user.id },
      }
    );
    expect(res.status).toEqual(200);

    const responses = await readAll(fixture);

    for (const [name, response] of Object.entries(responses)) {
      // The policy presenter throws on an unreadable document in tests.
      expect(response, `${name} failed`).not.toContain('"status":500');
      for (const document of fixture.documents) {
        expect(response, `${name} returned ${document.title}`).not.toContain(
          document.id
        );
        expect(response, `${name} returned ${document.title}`).not.toContain(
          document.title
        );
      }
    }
  });

  it("returns the documents to a user that is still a member", async () => {
    const fixture = await setup();

    const responses = await readAll(fixture);
    const all = Object.values(responses).join("\n");

    for (const document of fixture.documents) {
      expect(all, `no response returned ${document.title}`).toContain(
        document.id
      );
    }
  });
});
