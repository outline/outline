import type { onAuthenticatePayload } from "@hocuspocus/server";
import {
  DocumentPermission,
  Scope,
  TeamPreference,
  UserRole,
} from "@shared/types";
import AuthenticationExtension from "@server/collaboration/AuthenticationExtension";
import {
  Collection,
  Document,
  User,
  UserMembership,
  View,
} from "@server/models";
import { can } from "@server/policies";
import { buildOAuthUser, callMcpTool } from "@server/test/McpHelper";
import {
  buildAdmin,
  buildCollection,
  buildComment,
  buildDocument,
  buildOAuthAuthentication,
  buildPersonalCollection,
  buildRelationship,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

const keyword = "personalcollectionmatrix";

type UserKey =
  | "owner"
  | "readCollaborator"
  | "editCollaborator"
  | "member"
  | "admin"
  | "guest"
  | "otherTeam";

type DocumentKey = "root" | "nested";

const userKeys: UserKey[] = [
  "owner",
  "readCollaborator",
  "editCollaborator",
  "member",
  "admin",
  "guest",
  "otherTeam",
];

/** The expected read access of each user, before any endpoint is checked. */
const expectedRead: Record<
  UserKey,
  { collection: boolean; root: boolean; nested: boolean }
> = {
  owner: { collection: true, root: true, nested: true },
  readCollaborator: { collection: false, root: true, nested: true },
  editCollaborator: { collection: false, root: true, nested: true },
  member: { collection: false, root: false, nested: false },
  admin: { collection: false, root: false, nested: false },
  guest: { collection: false, root: false, nested: false },
  otherTeam: { collection: false, root: false, nested: false },
};

interface Fixture {
  users: Record<UserKey, User>;
  tokens: Record<UserKey, string>;
  collection: Collection;
  documents: Record<DocumentKey, Document>;
  publicDocument: Document;
}

let fixture: Fixture;

/**
 * Reload a user with the team, as the authentication middleware does.
 *
 * @param user The user to reload.
 * @returns the reloaded user.
 */
const reloadUser = (user: User) =>
  User.findByPk(user.id, { include: ["team"], rejectOnEmpty: true });

const canReadCollection = async (key: UserKey) => {
  const user = await reloadUser(fixture.users[key]);
  const collection = await Collection.findByPk(fixture.collection.id, {
    userId: user.id,
  });
  return !!can(user, "read", collection);
};

const canReadDocument = async (key: UserKey, documentKey: DocumentKey) => {
  const user = await reloadUser(fixture.users[key]);
  const document = await Document.findByPk(fixture.documents[documentKey].id, {
    userId: user.id,
  });
  return !!can(user, "read", document);
};

const readableDocumentIds = async (key: UserKey) => {
  const ids = new Set<string>();
  for (const documentKey of ["root", "nested"] as const) {
    if (await canReadDocument(key, documentKey)) {
      ids.add(fixture.documents[documentKey].id);
    }
  }
  return ids;
};

const personalIds = () =>
  new Set([
    fixture.collection.id,
    fixture.documents.root.id,
    fixture.documents.nested.id,
  ]);

/**
 * Check that a list contains only the personal items that the user can read.
 *
 * @param key The user.
 * @param label A label for the failure message.
 * @param ids The ids returned by the endpoint.
 * @param readable The personal ids that the user can read.
 */
const expectOnlyReadable = (
  key: UserKey,
  label: string,
  ids: string[],
  readable: Set<string>
) => {
  const leaked = ids.filter((id) => personalIds().has(id) && !readable.has(id));
  expect({ key, label, leaked }).toEqual({ key, label, leaked: [] });
};

const post = (key: UserKey, route: string, body: Record<string, unknown>) =>
  server.post(`/api/${route}`, fixture.users[key], { body });

beforeAll(async () => {
  const team = await buildTeam();
  team.setPreference(TeamPreference.PersonalDocs, true);
  await team.save();
  const otherTeam = await buildTeam();

  const owner = await buildUser({ teamId: team.id });
  const users: Record<UserKey, User> = {
    owner,
    readCollaborator: await buildUser({ teamId: team.id }),
    editCollaborator: await buildUser({ teamId: team.id }),
    member: await buildUser({ teamId: team.id }),
    admin: await buildAdmin({ teamId: team.id }),
    guest: await buildUser({ teamId: team.id, role: UserRole.Guest }),
    otherTeam: await buildAdmin({ teamId: otherTeam.id }),
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
  const withStructure = await Collection.findByPk(collection.id, {
    includeDocumentStructure: true,
    rejectOnEmpty: true,
  });
  await withStructure.addDocumentToStructure(root, 0);
  await withStructure.addDocumentToStructure(nested, 0);

  await UserMembership.create({
    documentId: root.id,
    userId: users.readCollaborator.id,
    permission: DocumentPermission.Read,
    createdById: owner.id,
  });
  await UserMembership.create({
    documentId: root.id,
    userId: users.editCollaborator.id,
    permission: DocumentPermission.ReadWrite,
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

  await buildComment({ documentId: root.id, userId: owner.id });

  // Everybody has viewed the document at some point.
  for (const user of Object.values(users)) {
    await View.create({ documentId: root.id, userId: user.id });
  }

  const tokens = {} as Record<UserKey, string>;
  for (const key of userKeys) {
    const auth = await buildOAuthAuthentication({
      user: users[key],
      scope: [Scope.Read, Scope.Write, Scope.Create],
    });
    tokens[key] = auth.accessToken!;
  }

  fixture = {
    users,
    tokens,
    collection,
    documents: { root, nested },
    publicDocument,
  };
});

describe("personal collection access matrix", () => {
  it("should match the expected read access", async () => {
    for (const key of userKeys) {
      const actual = {
        collection: await canReadCollection(key),
        root: await canReadDocument(key, "root"),
        nested: await canReadDocument(key, "nested"),
      };
      expect({ key, ...actual }).toEqual({ key, ...expectedRead[key] });
    }
  });

  it.each(userKeys)(
    "collection endpoints agree with read for %s",
    async (key) => {
      const canRead = await canReadCollection(key);
      const id = fixture.collection.id;

      for (const route of [
        "collections.info",
        "collections.memberships",
        "collections.group_memberships",
        "collections.documents",
        "events.list",
        "comments.list",
        "pins.list",
      ]) {
        const body = route === "events.list" ? { collectionId: id } : { id };
        const res = await post(
          key,
          route,
          route === "comments.list" || route === "pins.list"
            ? { collectionId: id }
            : body
        );
        expect({ key, route, ok: res.ok }).toEqual({
          key,
          route,
          ok: canRead,
        });
      }

      const list = await post(key, "collections.list", {});
      if (list.ok) {
        const json = await list.json();
        const ids: string[] = json.data.map((c: { id: string }) => c.id);
        expect({ key, listed: ids.includes(id) }).toEqual({
          key,
          listed: canRead,
        });
      }

      const listAll = await post(key, "collections.list", {
        includeListOnly: true,
      });
      if (listAll.ok) {
        const json = await listAll.json();
        const ids: string[] = json.data.map((c: { id: string }) => c.id);
        expect({ key, listedAll: ids.includes(id) }).toEqual({
          key,
          listedAll: canRead,
        });
      }

      const exported = await post(key, "collections.export", { id });
      expect({ key, exported: exported.ok }).toEqual({
        key,
        exported: key === "owner",
      });

      const collectionIds = await (
        await reloadUser(fixture.users[key])
      ).collectionIds({ skipCache: true });
      expect({ key, room: collectionIds.includes(id) }).toEqual({
        key,
        room: canRead,
      });
    }
  );

  it.each(userKeys)(
    "document endpoints agree with read for %s",
    async (key) => {
      for (const documentKey of ["root", "nested"] as const) {
        const canRead = await canReadDocument(key, documentKey);
        const id = fixture.documents[documentKey].id;

        for (const route of [
          "documents.info",
          "documents.documents",
          "documents.users",
          "documents.export",
          "documents.memberships",
          "views.list",
          "comments.list",
          "events.list",
          "relationships.list",
        ]) {
          const body =
            route === "documents.info" ||
            route === "documents.documents" ||
            route === "documents.export" ||
            route === "documents.memberships" ||
            route === "documents.users"
              ? { id }
              : { documentId: id };
          const res = await post(key, route, body);

          // Some of these endpoints need more than read access.
          if (canRead && route === "documents.memberships") {
            continue;
          }
          expect({ key, documentKey, route, ok: res.ok }).toEqual({
            key,
            documentKey,
            route,
            ok: canRead,
          });
        }
      }
    }
  );

  it.each(userKeys)("document lists agree with read for %s", async (key) => {
    const readable = await readableDocumentIds(key);

    const lists: [
      string,
      Record<string, unknown>,
      (json: never) => string[],
    ][] = [
      [
        "documents.list",
        {},
        (json: { data: { id: string }[] }) => json.data.map((d) => d.id),
      ],
      [
        "documents.viewed",
        {},
        (json: { data: { id: string }[] }) => json.data.map((d) => d.id),
      ],
      [
        "documents.search",
        { query: keyword },
        (json: { data: { document: { id: string } }[] }) =>
          json.data.map((d) => d.document.id),
      ],
      [
        "documents.search_titles",
        { query: keyword },
        (json: { data: { id: string }[] }) => json.data.map((d) => d.id),
      ],
      [
        "relationships.list",
        { documentId: fixture.publicDocument.id },
        (json: { data: { documents: { id: string }[] } }) =>
          json.data.documents.map((d) => d.id),
      ],
    ];

    for (const [route, body, getIds] of lists) {
      const res = await post(key, route, body);
      if (!res.ok) {
        continue;
      }
      const ids = getIds((await res.json()) as never);
      expectOnlyReadable(key, route, ids, readable);
    }

    // The owner must find their own documents.
    if (key === "owner") {
      const res = await post(key, "documents.search", { query: keyword });
      const json = await res.json();
      expect(json.data).toHaveLength(2);
    }
  });

  it.each(userKeys)("MCP tools agree with read for %s", async (key) => {
    const token = fixture.tokens[key];
    const canRead = await canReadCollection(key);

    const collection = await callMcpTool(server, token, "fetch", {
      resource: "collection",
      id: fixture.collection.id,
    });
    expect({ key, fetchCollection: !collection?.result?.isError }).toEqual({
      key,
      fetchCollection: canRead,
    });

    const tree = await callMcpTool(server, token, "list_collection_documents", {
      collectionId: fixture.collection.id,
    });
    expect({ key, tree: !tree?.result?.isError }).toEqual({
      key,
      tree: canRead,
    });

    const collections = await callMcpTool(server, token, "list_collections");
    const collectionsText = collections?.result?.content
      ?.map((c) => c.text)
      .join("\n");
    expect({
      key,
      listed: !!collectionsText?.includes(fixture.collection.id),
    }).toEqual({ key, listed: canRead });

    for (const documentKey of ["root", "nested"] as const) {
      const canReadDoc = await canReadDocument(key, documentKey);
      const id = fixture.documents[documentKey].id;
      const document = await callMcpTool(server, token, "fetch", {
        resource: "document",
        id,
      });
      expect({
        key,
        documentKey,
        fetchDocument: !document?.result?.isError,
      }).toEqual({ key, documentKey, fetchDocument: canReadDoc });

      const comments = await callMcpTool(server, token, "list_comments", {
        documentId: id,
      });
      if (documentKey === "root") {
        expect({ key, comments: !comments?.result?.isError }).toEqual({
          key,
          comments: canReadDoc,
        });
      }
    }

    const readable = await readableDocumentIds(key);
    const search = await callMcpTool(server, token, "list_documents", {
      query: keyword,
    });
    const searchText =
      search?.result?.content?.map((c) => c.text).join("\n") ?? "";
    const found = [
      fixture.documents.root.id,
      fixture.documents.nested.id,
    ].filter((id) => searchText.includes(id));
    expectOnlyReadable(key, "list_documents", found, readable);
  });

  it.each(userKeys)("collaboration agrees with read for %s", async (key) => {
    const extension = new AuthenticationExtension();
    const user = fixture.users[key];

    for (const documentKey of ["root", "nested"] as const) {
      const canRead = await canReadDocument(key, documentKey);
      const reloaded = await reloadUser(user);
      const document = await Document.findByPk(
        fixture.documents[documentKey].id,
        { userId: user.id }
      );
      const canUpdate = !!can(reloaded, "update", document);
      const connection = { readOnly: false };

      let connected = true;
      try {
        await extension.onAuthenticate({
          token: user.getCollaborationToken(),
          documentName: `document.${fixture.documents[documentKey].id}`,
          connection,
        } as onAuthenticatePayload);
      } catch {
        connected = false;
      }

      expect({ key, documentKey, connected }).toEqual({
        key,
        documentKey,
        connected: canRead,
      });
      if (connected) {
        expect({ key, documentKey, readOnly: connection.readOnly }).toEqual({
          key,
          documentKey,
          readOnly: !canUpdate,
        });
      }
    }
  });
});

describe("personal collection document presenter", () => {
  it("should include the owner for the owner and collaborators", async () => {
    for (const key of ["owner", "readCollaborator"] as const) {
      const res = await post(key, "documents.info", {
        id: fixture.documents.nested.id,
      });
      const body = await res.json();
      expect({ key, ownerId: body.data.ownerId }).toEqual({
        key,
        ownerId: fixture.users.owner.id,
      });
    }

    const res = await post("owner", "documents.info", {
      id: fixture.publicDocument.id,
    });
    const body = await res.json();
    expect(body.data.ownerId).toBeNull();
  });
});

describe("personal collection with personal documents turned off", () => {
  it("should keep documents readable and stop edits", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildPersonalCollection(user);
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });

    const info = await server.post("/api/documents.info", user, {
      body: { id: document.id },
    });
    expect(info.status).toEqual(200);

    const update = await server.post("/api/documents.update", user, {
      body: { id: document.id, text: "Changed" },
    });
    expect(update.status).toEqual(403);

    const create = await server.post("/api/documents.create", user, {
      body: { collectionId: collection.id, title: "New", publish: true },
    });
    expect(create.status).toEqual(403);

    const mcpCreate = await callMcpTool(
      server,
      accessToken,
      "create_document",
      {
        collectionId: collection.id,
        title: "New",
      }
    );
    expect(mcpCreate?.result?.isError).toBeTruthy();

    const archive = await server.post("/api/documents.archive", user, {
      body: { id: document.id },
    });
    expect(archive.status).toEqual(200);

    const remove = await server.post("/api/documents.delete", user, {
      body: { id: document.id },
    });
    expect(remove.status).toEqual(200);
  });

  it("should allow the owner to move documents out", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildPersonalCollection(user);
    const destination = await buildCollection({
      teamId: team.id,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });

    const back = await server.post("/api/documents.move", user, {
      body: { id: document.id, collectionId: collection.id },
    });
    expect(back.status).toEqual(403);

    const res = await server.post("/api/documents.move", user, {
      body: { id: document.id, collectionId: destination.id },
    });
    expect(res.status).toEqual(200);
  });
});
