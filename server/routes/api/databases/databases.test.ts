import { randomUUID } from "node:crypto";
import {
  CollectionPermission,
  DataViewType,
  FilterOperator,
  PropertyType,
  RollupAggregation,
} from "@shared/types";
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

  it("should drop view references to a property removed from the schema", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    const keptId = randomUUID();
    const removedId = randomUUID();
    const viewId = randomUUID();
    const database = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      dataSchema: [
        { id: keptId, name: "Name", type: PropertyType.Text },
        {
          id: removedId,
          name: "Stage",
          type: PropertyType.Select,
          options: [],
        },
      ],
      views: [
        {
          id: viewId,
          name: "Table",
          type: DataViewType.Table,
          columns: [
            { propertyId: keptId, visible: true },
            { propertyId: removedId, visible: true },
          ],
          sorts: [{ propertyId: removedId, direction: "asc" }],
          filter: {
            conjunction: "and",
            conditions: [
              { propertyId: removedId, operator: FilterOperator.IsNotEmpty },
            ],
          },
          groupBy: removedId,
        },
      ],
    });

    // deleting a column sends the remaining schema, and nothing else — the
    // client cannot know the view still points at what it dropped
    const res = await server.post("/api/databases.update", user, {
      body: {
        id: database.id,
        dataSchema: [{ id: keptId, name: "Name", type: PropertyType.Text }],
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.dataSchema).toHaveLength(1);

    const view = body.data.views[0];
    expect(view.columns).toHaveLength(1);
    expect(view.columns[0].propertyId).toEqual(keptId);
    expect(view.sorts).toHaveLength(0);
    expect(view.filter).toBeFalsy();
    expect(view.groupBy).toBeFalsy();
  });

  it("should drop a rollup when the relation it walks is removed", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    const target = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });
    const relationId = randomUUID();
    const rollupId = randomUUID();
    const database = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      dataSchema: [
        {
          id: relationId,
          name: "Area",
          type: PropertyType.Relation,
          config: { targetDatabaseId: target.id },
        },
        {
          id: rollupId,
          name: "How many",
          type: PropertyType.Rollup,
          config: {
            relationPropertyId: relationId,
            rollupAggregation: RollupAggregation.Count,
          },
        },
      ],
    });

    // the relation is deleted but the rollup is still sent, which is what
    // deleting the relation's column in the UI produces
    const res = await server.post("/api/databases.update", user, {
      body: {
        id: database.id,
        dataSchema: [
          {
            id: rollupId,
            name: "How many",
            type: PropertyType.Rollup,
            config: {
              relationPropertyId: relationId,
              rollupAggregation: RollupAggregation.Count,
            },
          },
        ],
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.dataSchema).toHaveLength(0);
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

describe("#databases.move_row", () => {
  it("should persist the index of the moved row", async () => {
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
      databaseIndex: "P",
    });

    const res = await server.post("/api/databases.move_row", user, {
      body: { id: database.id, documentId: row.id, index: "Q" },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);

    await row.reload();
    expect(row.databaseIndex).toEqual("Q");
  });

  it("should order a row that has never been ordered", async () => {
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
    expect(row.databaseIndex).toBeFalsy();

    const res = await server.post("/api/databases.move_row", user, {
      body: { id: database.id, documentId: row.id, index: "P" },
    });
    expect(res.status).toEqual(200);

    await row.reload();
    expect(row.databaseIndex).toEqual("P");
  });

  it("should reject a row belonging to another database", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    const database = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });
    const other = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });
    const row = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      databaseId: other.id,
    });

    const res = await server.post("/api/databases.move_row", user, {
      body: { id: database.id, documentId: row.id, index: "P" },
    });
    expect(res.status).toEqual(400);

    await row.reload();
    expect(row.databaseIndex).toBeFalsy();
  });

  it("should reject a document that is not a row", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    const database = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });
    const document = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });

    const res = await server.post("/api/databases.move_row", user, {
      body: { id: database.id, documentId: document.id, index: "P" },
    });
    expect(res.status).toEqual(400);
  });

  it("should require write access", async () => {
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
      databaseIndex: "P",
    });
    const viewer = await buildViewer({ teamId: team.id });

    const res = await server.post("/api/databases.move_row", viewer, {
      body: { id: database.id, documentId: row.id, index: "Q" },
    });
    expect(res.status).toEqual(403);

    await row.reload();
    expect(row.databaseIndex).toEqual("P");
  });

  it("should reject an invalid index", async () => {
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

    // an index has to be there, has to be printable ASCII, and a trailing space
    // would break calculating an index next to it later on
    for (const index of ["", "P ", "P\n", "Pé", "P".repeat(257)]) {
      const res = await server.post("/api/databases.move_row", user, {
        body: { id: database.id, documentId: row.id, index },
      });
      expect(res.status).toEqual(400);
    }

    await row.reload();
    expect(row.databaseIndex).toBeFalsy();
  });

  it("should fail when the feature is disabled", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const database = await buildDatabase({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });
    const row = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
      databaseId: database.id,
    });

    const res = await server.post("/api/databases.move_row", user, {
      body: { id: database.id, documentId: row.id, index: "P" },
    });
    expect(res.status).toEqual(400);
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

describe("#databases.archive", () => {
  it("should hide the database and its rows, then restore both", async () => {
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

    const archived = await server.post("/api/databases.archive", user, {
      body: { id: database.id },
    });
    expect(archived.status).toEqual(200);

    // gone from the active list, and its rows with it
    const list = await (
      await server.post("/api/databases.list", user, {
        body: { collectionId: collection.id },
      })
    ).json();
    expect(list.data).toHaveLength(0);

    const rows = await (
      await server.post("/api/documents.list", user, {
        body: { databaseId: database.id },
      })
    ).json();
    expect(rows.data).toHaveLength(0);

    // the row keeps everything that made it a row
    await row.reload({ paranoid: false });
    expect(row.databaseId).toEqual(database.id);
    expect(row.archivedAt).toBeTruthy();

    const restored = await server.post("/api/databases.restore", user, {
      body: { id: database.id },
    });
    expect(restored.status).toEqual(200);

    const after = await (
      await server.post("/api/databases.list", user, {
        body: { collectionId: collection.id },
      })
    ).json();
    expect(after.data).toHaveLength(1);

    await row.reload();
    expect(row.archivedAt).toBeNull();
  });

  it("should list archived databases only when asked", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    const database = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });
    await server.post("/api/databases.archive", user, {
      body: { id: database.id },
    });

    const res = await server.post("/api/databases.list", user, {
      body: { collectionId: collection.id, archived: true },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toEqual(database.id);
  });

  it("should leave a separately archived row archived on restore", async () => {
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
      archivedAt: new Date("2020-01-01"),
    });

    await server.post("/api/databases.archive", user, {
      body: { id: database.id },
    });
    await server.post("/api/databases.restore", user, {
      body: { id: database.id },
    });

    // it was not the database that archived this row, so restoring must not
    // bring it back
    await row.reload({ paranoid: false });
    expect(row.archivedAt).toBeTruthy();
  });

  it("should require write access to archive", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    const viewer = await buildViewer({ teamId: team.id });
    const database = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });

    const res = await server.post("/api/databases.archive", viewer, {
      body: { id: database.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#databases.delete", () => {
  it("should keep the rows and their property values", async () => {
    const { team, user, collection } = await buildEnabledTeam();
    const propertyId = randomUUID();
    const database = await buildDatabase({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      dataSchema: [{ id: propertyId, name: "Stage", type: PropertyType.Text }],
    });
    const row = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      databaseId: database.id,
    });
    await row.update({ properties: { [propertyId]: "shipped" } });

    const res = await server.post("/api/databases.delete", user, {
      body: { id: database.id },
    });
    expect(res.status).toEqual(200);

    await row.reload();
    expect(row.databaseId).toBeNull();
    // values are keyed by property id and simply stop resolving, so deleting
    // the database does not destroy them
    expect(row.properties).toEqual({ [propertyId]: "shipped" });
  });
});
