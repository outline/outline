import { DocumentPermission, Scope } from "@shared/types";
import { UserMembership, View } from "@server/models";
import type { User } from "@server/models";
import { callMcpTool } from "@server/test/McpHelper";
import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildOAuthAuthentication,
  buildPersonalCollection,
  buildRelationship,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

const keyword = "personalcollectionlists";

type UserKey = "owner" | "collaborator" | "member" | "admin";

const userKeys: UserKey[] = ["owner", "collaborator", "member", "admin"];

let users: Record<UserKey, User>;
let tokens: Record<UserKey, string>;
let collectionId: string;
let rootId: string;
let nestedId: string;
let publicDocumentId: string;

/**
 * The personal ids that a user is expected to see. The collaborator has a
 * membership on the root document, which the nested document inherits.
 *
 * @param key The user.
 * @returns the ids of the collection and documents.
 */
const readableIds = (key: UserKey) => {
  switch (key) {
    case "owner":
      return [collectionId, rootId, nestedId];
    case "collaborator":
      return [rootId, nestedId];
    default:
      return [];
  }
};

const personalIds = () => [collectionId, rootId, nestedId];

beforeAll(async () => {
  const team = await buildTeam();
  const owner = await buildUser({ teamId: team.id });
  users = {
    owner,
    collaborator: await buildUser({ teamId: team.id }),
    member: await buildUser({ teamId: team.id }),
    admin: await buildAdmin({ teamId: team.id }),
  };

  const collection = await buildPersonalCollection(owner);
  const root = await buildDocument({
    teamId: team.id,
    userId: owner.id,
    collectionId: collection.id,
    title: `Root ${keyword}`,
    text: `Root ${keyword}`,
  });
  const nested = await buildDocument({
    teamId: team.id,
    userId: owner.id,
    collectionId: collection.id,
    parentDocumentId: root.id,
    title: `Nested ${keyword}`,
    text: `Nested ${keyword}`,
  });
  await collection.addDocumentToStructure(root, 0);
  await collection.addDocumentToStructure(nested, 0);

  await UserMembership.create({
    documentId: root.id,
    userId: users.collaborator.id,
    permission: DocumentPermission.Read,
    createdById: owner.id,
  });

  // A public document that links to the personal document.
  const publicCollection = await buildCollection({
    teamId: team.id,
    userId: owner.id,
  });
  const publicDocument = await buildDocument({
    teamId: team.id,
    userId: owner.id,
    collectionId: publicCollection.id,
  });
  await buildRelationship({
    userId: owner.id,
    documentId: publicDocument.id,
    reverseDocumentId: root.id,
  });

  // Everybody has viewed the document at some point.
  for (const user of Object.values(users)) {
    await View.create({ documentId: root.id, userId: user.id });
  }

  tokens = {} as Record<UserKey, string>;
  for (const key of userKeys) {
    const auth = await buildOAuthAuthentication({
      user: users[key],
      scope: [Scope.Read],
    });
    tokens[key] = auth.accessToken!;
  }

  collectionId = collection.id;
  rootId = root.id;
  nestedId = nested.id;
  publicDocumentId = publicDocument.id;
});

describe("personal collection lists", () => {
  // Lists filter in queries rather than through the read policy, so they are
  // checked here for each user.
  it.each(userKeys)("only list what %s can read", async (key) => {
    const ids = (values: { id: string }[]) => values.map((value) => value.id);
    const post = async (route: string, body: Record<string, unknown>) => {
      const res = await server.post(`/api/${route}`, users[key], { body });
      expect({ route, status: res.status }).toEqual({ route, status: 200 });
      return res.json();
    };
    const mcpText = async (tool: string, args: Record<string, unknown>) => {
      const res = await callMcpTool(server, tokens[key], tool, args);
      return res?.result?.content?.map((c) => c.text).join("\n") ?? "";
    };

    const results: Record<string, string[]> = {
      "collections.list": ids((await post("collections.list", {})).data),
      "collections.list includeListOnly": ids(
        (await post("collections.list", { includeListOnly: true })).data
      ),
      "documents.list": ids((await post("documents.list", {})).data),
      "documents.viewed": ids((await post("documents.viewed", {})).data),
      "documents.search": (
        await post("documents.search", { query: keyword })
      ).data.map((result: { document: { id: string } }) => result.document.id),
      "documents.search_titles": ids(
        (await post("documents.search_titles", { query: keyword })).data
      ),
      "relationships.list": ids(
        (await post("relationships.list", { documentId: publicDocumentId }))
          .data.documents
      ),
    };

    // Documents include their collectionId, so only document ids are matched.
    const collectionsText = await mcpText("list_collections", {});
    const documentsText = await mcpText("list_documents", { query: keyword });
    results.list_collections = personalIds().filter((id) =>
      collectionsText.includes(id)
    );
    results.list_documents = [rootId, nestedId].filter((id) =>
      documentsText.includes(id)
    );

    const readable = readableIds(key);
    for (const [label, listed] of Object.entries(results)) {
      const leaked = listed.filter(
        (id) => personalIds().includes(id) && !readable.includes(id)
      );
      expect({ key, label, leaked }).toEqual({ key, label, leaked: [] });
    }

    if (key === "owner") {
      expect(results["collections.list"]).toContain(collectionId);
      expect(results["documents.search"]).toEqual(
        expect.arrayContaining([rootId, nestedId])
      );
    }
  });
});

describe("personal collection document presenter", () => {
  it("should include the owner for the owner and collaborators", async () => {
    for (const key of ["owner", "collaborator"] as const) {
      const res = await server.post("/api/documents.info", users[key], {
        body: { id: nestedId },
      });
      const body = await res.json();
      expect({ key, ownerId: body.data.ownerId }).toEqual({
        key,
        ownerId: users.owner.id,
      });
    }

    const res = await server.post("/api/documents.info", users.owner, {
      body: { id: publicDocumentId },
    });
    const body = await res.json();
    expect(body.data.ownerId).toBeNull();
  });
});
