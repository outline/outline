import { randomUUID } from "node:crypto";
import { CollectionPermission, PropertyType } from "@shared/types";
import { Database, Document, UserMembership } from "@server/models";
import {
  buildCollection,
  buildDatabase,
  buildDocument,
  buildTeam,
  buildUser,
  buildViewer,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

/** Builds a team with the feature enabled, plus a user and a collection. */
async function buildEnabledTeam() {
  const team = await buildTeam({ preferences: { documentDatabases: true } });
  const user = await buildUser({ teamId: team.id });
  const collection = await buildCollection({
    teamId: team.id,
    userId: user.id,
  });
  return { team, user, collection };
}

describe("#databases.create", () => {
  it("should create a database with a default view", async () => {
    const { user, collection } = await buildEnabledTeam();

    const res = await server.post("/api/databases.create", user, {
      body: { collectionId: collection.id, name: "Roadmap" },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("Roadmap");
    expect(body.data.collectionId).toEqual(collection.id);
    expect(body.data.views).toHaveLength(1);
    expect(body.data.dataSchema).toEqual([]);
  });

  it("should allow several databases in one collection", async () => {
    const { user, collection } = await buildEnabledTeam();

    await server.post("/api/databases.create", user, {
      body: { collectionId: collection.id, name: "First" },
    });
    const res = await server.post("/api/databases.create", user, {
      body: { collectionId: collection.id, name: "Second" },
    });
    expect(res.status).toEqual(200);

    const count = await Database.count({
      where: { collectionId: collection.id },
    });
    expect(count).toEqual(2);
  });

  it("should fail when the feature is disabled", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await server.post("/api/databases.create", user, {
      body: { collectionId: collection.id },
    });
    expect(res.status).toEqual(400);
  });

  it("should require write access to the collection", async () => {
    const { team, collection } = await buildEnabledTeam();
    const viewer = await buildViewer({ teamId: team.id });

    const res = await server.post("/api/databases.create", viewer, {
      body: { collectionId: collection.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#databases.list", () => {
  it("should list the databases of a collection", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      name: "One",
    });
    await buildDatabase({ teamId: team.id, userId: user.id, name: "Other" });

    const res = await server.post("/api/databases.list", user, {
      body: { collectionId: collection.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toEqual("One");
  });

  it("should not list databases from another team", async () => {
    const { user } = await buildEnabledTeam();
    const otherTeam = await buildTeam({
      preferences: { documentDatabases: true },
    });
    await buildDatabase({ teamId: otherTeam.id, name: "Secret" });

    const res = await server.post("/api/databases.list", user, { body: {} });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(
      body.data.some((item: { name: string }) => item.name === "Secret")
    ).toBe(false);
  });

  it("should not list databases in private collections without membership", async () => {
    const { team, user } = await buildEnabledTeam();
    const owner = await buildUser({ teamId: team.id });
    const privateCollection = await buildCollection({
      teamId: team.id,
      userId: owner.id,
      permission: null,
    });
    await buildDatabase({
      teamId: team.id,
      userId: owner.id,
      collectionId: privateCollection.id,
      name: "Private",
    });

    const res = await server.post("/api/databases.list", user, { body: {} });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(
      body.data.some((item: { name: string }) => item.name === "Private")
    ).toBe(false);
  });

  it("should present write policies to a member of a private collection", async () => {
    const team = await buildTeam({ preferences: { documentDatabases: true } });
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: user.id,
      permission: null,
    });
    await UserMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: CollectionPermission.ReadWrite,
    });
    const database = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });

    const res = await server.post("/api/databases.list", user, {
      body: { collectionId: collection.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(1);
    const abilities = body.policies.find(
      (policy: { id: string }) => policy.id === database.id
    )?.abilities;
    expect(abilities?.read).toBe(true);
    expect(abilities?.createRow).toBe(true);
    expect(abilities?.update).toBe(true);
  });
});

describe("#databases.update", () => {
  it("should update the schema and views", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    const database = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });
    const propertyId = randomUUID();

    const res = await server.post("/api/databases.update", user, {
      body: {
        id: database.id,
        dataSchema: [
          { id: propertyId, name: "Status", type: PropertyType.Text },
        ],
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.dataSchema).toHaveLength(1);
    expect(body.data.dataSchema[0].name).toEqual("Status");
  });

  it("should reject a view referencing an unknown property", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    const database = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });

    const res = await server.post("/api/databases.update", user, {
      body: {
        id: database.id,
        views: [
          {
            id: randomUUID(),
            name: "Table",
            type: "table",
            columns: [{ propertyId: randomUUID(), visible: true }],
            sorts: [],
          },
        ],
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should accept several views of the same type", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    const database = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });

    const res = await server.post("/api/databases.update", user, {
      body: {
        id: database.id,
        views: [
          {
            id: randomUUID(),
            name: "Mine",
            type: "table",
            columns: [],
            sorts: [],
          },
          {
            id: randomUUID(),
            name: "Everyone",
            type: "table",
            columns: [],
            sorts: [],
          },
        ],
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.views).toHaveLength(2);
  });

  it("should move the database and its rows to another collection", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    const destination = await buildCollection({
      teamId: team.id,
      userId: user.id,
    });
    const database = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });
    const row = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      databaseId: database.id,
    });

    const res = await server.post("/api/databases.update", user, {
      body: { id: database.id, collectionId: destination.id },
    });
    expect(res.status).toEqual(200);

    await row.reload();
    expect(row.collectionId).toEqual(destination.id);
  });

  it("should create the mirror property for a bidirectional relation", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    const source = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });
    const target = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });
    const relationId = randomUUID();
    const inverseId = randomUUID();

    const res = await server.post("/api/databases.update", user, {
      body: {
        id: source.id,
        dataSchema: [
          {
            id: relationId,
            name: "Linked",
            type: PropertyType.Relation,
            config: {
              targetDatabaseId: target.id,
              inversePropertyId: inverseId,
            },
          },
        ],
      },
    });
    expect(res.status).toEqual(200);

    await target.reload();
    expect(target.getProperty(inverseId)?.config?.targetDatabaseId).toEqual(
      source.id
    );
  });

  it("should require write access", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    const database = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });
    const viewer = await buildViewer({ teamId: team.id });

    const res = await server.post("/api/databases.update", viewer, {
      body: { id: database.id, name: "Nope" },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#databases.delete", () => {
  it("should delete the database and keep its rows as documents", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    const database = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });
    const row = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      databaseId: database.id,
    });

    const res = await server.post("/api/databases.delete", user, {
      body: { id: database.id },
    });
    expect(res.status).toEqual(200);

    expect(await Database.findByPk(database.id)).toBeNull();

    const reloaded = await Document.findByPk(row.id, { rejectOnEmpty: true });
    expect(reloaded.databaseId).toBeNull();
    expect(reloaded.deletedAt).toBeNull();
  });

  it("should remove mirror properties from other databases", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    const target = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });
    const inverseId = randomUUID();
    const source = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      dataSchema: [
        {
          id: randomUUID(),
          name: "Linked",
          type: PropertyType.Relation,
          config: {
            targetDatabaseId: target.id,
            inversePropertyId: inverseId,
          },
        },
      ],
    });
    target.upsertProperty({
      id: inverseId,
      name: "Back",
      type: PropertyType.Relation,
      config: { targetDatabaseId: source.id },
    });
    await target.save();

    const res = await server.post("/api/databases.delete", user, {
      body: { id: source.id },
    });
    expect(res.status).toEqual(200);

    await target.reload();
    expect(target.getProperty(inverseId)).toBeUndefined();
  });

  it("should require write access", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    const database = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });
    const viewer = await buildViewer({ teamId: team.id });

    const res = await server.post("/api/databases.delete", viewer, {
      body: { id: database.id },
    });
    expect(res.status).toEqual(403);
  });
});
