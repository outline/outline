import { randomUUID } from "node:crypto";
import { randomString } from "@shared/random";
import type { DataView, Property } from "@shared/types";
import { DataViewType, FilterOperator, PropertyType } from "@shared/types";
import slugify from "@shared/utils/slugify";
import {
  buildUser,
  buildGroup,
  buildCollection,
  buildTeam,
  buildDocument,
} from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import Collection from "./Collection";
import Document from "./Document";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("#url", () => {
  it("should return correct url for the collection", () => {
    const collection = new Collection({
      id: "1234",
    });
    expect(collection.path).toBe(`/collection/untitled-${collection.urlId}`);
  });

  it("should return correct url with slugified collection name", () => {
    const path = Collection.getPath({
      name: "Test Collection",
      urlId: "abcdefghij",
    });
    expect(path).toBe("/collection/test-collection-abcdefghij");
  });

  it("should return untitled when collection name is empty", () => {
    const path = Collection.getPath({
      name: "",
      urlId: "abcdefghij",
    });
    expect(path).toBe("/collection/untitled-abcdefghij");
  });
});

describe("getDocumentParents", () => {
  it("should return array of parent document ids", async () => {
    const parent = await buildDocument();
    const document = await buildDocument();
    const collection = await buildCollection({
      documentStructure: [
        {
          ...(await parent.toNavigationNode()),
          children: [await document.toNavigationNode()],
        },
      ],
    });
    const result = collection.getDocumentParents(document.id);
    expect(result?.length).toBe(1);
    expect(result ? result[0] : undefined).toBe(parent.id);
  });

  it("should return array of parent document ids", async () => {
    const parent = await buildDocument();
    const document = await buildDocument();
    const collection = await buildCollection({
      documentStructure: [
        {
          ...(await parent.toNavigationNode()),
          children: [await document.toNavigationNode()],
        },
      ],
    });
    const result = collection.getDocumentParents(parent.id);
    expect(result?.length).toBe(0);
  });

  it("should not error if documentStructure is empty", async () => {
    const parent = await buildDocument();
    await buildDocument();
    const collection = await buildCollection();
    const result = collection.getDocumentParents(parent.id);
    expect(result).toBe(undefined);
  });
});

describe("getDocumentTree", () => {
  it("should return document tree", async () => {
    const document = await buildDocument();
    const collection = await buildCollection({
      documentStructure: [await document.toNavigationNode()],
    });
    expect(collection.getDocumentTree(document.id)).toEqual(
      await document.toNavigationNode()
    );
  });

  it("should return nested documents in tree", async () => {
    const parent = await buildDocument();
    const document = await buildDocument();
    const collection = await buildCollection({
      documentStructure: [
        {
          ...(await parent.toNavigationNode()),
          children: [await document.toNavigationNode()],
        },
      ],
    });

    expect(collection.getDocumentTree(parent.id)).toEqual({
      ...(await parent.toNavigationNode()),
      children: [await document.toNavigationNode()],
    });
    expect(collection.getDocumentTree(document.id)).toEqual(
      await document.toNavigationNode()
    );
  });
});

describe("#addDocumentToStructure", () => {
  it("should add as last element without index", async () => {
    const collection = await buildCollection();
    const id = randomUUID();
    const newDocument = await buildDocument({
      id,
      title: "New end node",
      parentDocumentId: null,
      teamId: collection.teamId,
    });
    await collection.addDocumentToStructure(newDocument);
    expect(collection.documentStructure!.length).toBe(1);
    expect(collection.documentStructure![0].id).toBe(id);

    // should not append multiple times
    await collection.addDocumentToStructure(newDocument);
    expect(collection.documentStructure!.length).toBe(1);
  });

  it("should add with an index", async () => {
    const collection = await buildCollection();
    const id = randomUUID();
    const newDocument = await buildDocument({
      id,
      title: "New end node",
      parentDocumentId: null,
      teamId: collection.teamId,
    });
    await collection.addDocumentToStructure(newDocument, 1);
    expect(collection.documentStructure!.length).toBe(1);
    expect(collection.documentStructure![0].id).toBe(id);
  });

  it("should add as a child if with parent", async () => {
    const collection = await buildCollection();
    const document = await buildDocument({ collectionId: collection.id });
    await collection.reload();

    const id = randomUUID();
    const newDocument = await buildDocument({
      id,
      title: "New end node",
      parentDocumentId: document.id,
      teamId: collection.teamId,
    });
    await collection.addDocumentToStructure(newDocument, 1);
    expect(collection.documentStructure!.length).toBe(1);
    expect(collection.documentStructure![0].id).toBe(document.id);
    expect(collection.documentStructure![0].children.length).toBe(1);
    expect(collection.documentStructure![0].children[0].id).toBe(id);
  });

  it("should add as a child if with parent with index", async () => {
    const collection = await buildCollection();
    const document = await buildDocument({ collectionId: collection.id });
    await collection.reload();

    const newDocument = await buildDocument({
      id: randomUUID(),
      title: "node",
      parentDocumentId: document.id,
      teamId: collection.teamId,
    });
    const id = randomUUID();
    const secondDocument = await buildDocument({
      id,
      title: "New start node",
      parentDocumentId: document.id,
      teamId: collection.teamId,
    });
    await collection.addDocumentToStructure(newDocument);
    await collection.addDocumentToStructure(secondDocument, 0);
    expect(collection.documentStructure!.length).toBe(1);
    expect(collection.documentStructure![0].id).toBe(document.id);
    expect(collection.documentStructure![0].children.length).toBe(2);
    expect(collection.documentStructure![0].children[0].id).toBe(id);
  });

  it("should add the document along with its nested document(s)", async () => {
    const collection = await buildCollection();

    const document = await buildDocument({
      title: "New doc",
      teamId: collection.teamId,
    });

    // create a nested doc within New doc
    const nestedDocument = await buildDocument({
      title: "Nested doc",
      parentDocumentId: document.id,
      teamId: collection.teamId,
    });

    expect(collection.documentStructure).toBeNull();

    await collection.addDocumentToStructure(document);

    expect(collection.documentStructure).not.toBeNull();
    expect(collection.documentStructure).toHaveLength(1);
    expect(collection.documentStructure![0].id).toBe(document.id);
    expect(collection.documentStructure![0].children).toHaveLength(1);
    expect(collection.documentStructure![0].children[0].id).toBe(
      nestedDocument.id
    );
  });

  it("should add the document along with its archived nested document(s)", async () => {
    const collection = await buildCollection();

    const document = await buildDocument({
      title: "New doc",
      teamId: collection.teamId,
    });

    // create a nested doc within New doc
    const nestedDocument = await buildDocument({
      title: "Nested doc",
      parentDocumentId: document.id,
      teamId: collection.teamId,
    });

    nestedDocument.archivedAt = new Date();
    await nestedDocument.save();

    expect(collection.documentStructure).toBeNull();

    await collection.addDocumentToStructure(document, undefined, {
      includeArchived: true,
    });

    expect(collection.documentStructure).not.toBeNull();
    expect(collection.documentStructure).toHaveLength(1);
    expect(collection.documentStructure![0].id).toBe(document.id);
    expect(collection.documentStructure![0].children).toHaveLength(1);
    expect(collection.documentStructure![0].children[0].id).toBe(
      nestedDocument.id
    );
  });
  describe("options: documentJson", () => {
    it("should append supplied json over document's own", async () => {
      const collection = await buildCollection();
      const id = randomUUID();
      const newDocument = await buildDocument({
        id: randomUUID(),
        title: "New end node",
        parentDocumentId: null,
        teamId: collection.teamId,
      });
      await collection.addDocumentToStructure(newDocument, undefined, {
        documentJson: {
          id,
          title: "Parent",
          url: "parent",
          children: [
            {
              id,
              title: "Totally fake",
              children: [],
              url: "totally-fake",
            },
          ],
        },
      });
      expect(collection.documentStructure![0].children.length).toBe(1);
      expect(collection.documentStructure![0].children[0].id).toBe(id);
    });
  });
});

describe("#updateDocument", () => {
  it("should update root document's data", async () => {
    const collection = await buildCollection();
    const document = await buildDocument({ collectionId: collection.id });
    await collection.reload();

    document.title = "Updated title";
    await document.save();
    await collection.updateDocument(document);
    expect(collection.documentStructure![0].title).toBe("Updated title");
  });

  it("should update child document's data", async () => {
    const collection = await buildCollection();
    const document = await buildDocument({ collectionId: collection.id });
    await collection.reload();

    const newDocument = await buildDocument({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      lastModifiedById: collection.createdById,
      createdById: collection.createdById,
      title: "Child document",
      text: "content",
    });
    await collection.addDocumentToStructure(newDocument);
    newDocument.title = "Updated title";
    await newDocument.save();
    await collection.updateDocument(newDocument);
    const reloaded = await collection.reload();
    expect(reloaded!.documentStructure![0].children[0].title).toBe(
      "Updated title"
    );
  });
});

describe("#removeDocument", () => {
  it("should save if removing", async () => {
    const collection = await buildCollection();
    const document = await buildDocument({ collectionId: collection.id });
    await collection.reload();

    const saveSpy = vi.spyOn(collection, "save");
    await collection.deleteDocument(document);
    expect(saveSpy).toHaveBeenCalled();
  });

  it("should remove documents from root", async () => {
    const collection = await buildCollection();
    const document = await buildDocument({ collectionId: collection.id });
    await collection.reload();

    await collection.deleteDocument(document);
    expect(collection.documentStructure!.length).toBe(0);
    // Verify that the document was removed
    const collectionDocuments = await Document.findAndCountAll({
      where: {
        collectionId: collection.id,
      },
    });
    expect(collectionDocuments.count).toBe(0);
  });

  it("should remove a document with child documents", async () => {
    const collection = await buildCollection();
    const document = await buildDocument({ collectionId: collection.id });
    await collection.reload();

    // Add a child for testing
    const newDocument = await buildDocument({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      lastModifiedById: collection.createdById,
      createdById: collection.createdById,
      title: "Child document",
      text: "content",
    });
    await collection.addDocumentToStructure(newDocument);
    expect(collection.documentStructure![0].children.length).toBe(1);
    // Remove the document
    await collection.deleteDocument(document);
    expect(collection.documentStructure!.length).toBe(0);
    const collectionDocuments = await Document.findAndCountAll({
      where: {
        collectionId: collection.id,
      },
    });
    expect(collectionDocuments.count).toBe(0);
  });

  it("should remove a child document", async () => {
    const collection = await buildCollection();
    const document = await buildDocument({ collectionId: collection.id });
    await collection.reload();

    // Add a child for testing
    const newDocument = await buildDocument({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      lastModifiedById: collection.createdById,
      createdById: collection.createdById,
      publishedAt: new Date(),
      title: "Child document",
      text: "content",
    });
    await collection.addDocumentToStructure(newDocument);
    expect(collection.documentStructure!.length).toBe(1);
    expect(collection.documentStructure![0].children.length).toBe(1);
    // Remove the document
    await collection.deleteDocument(newDocument);
    const reloaded = await collection.reload();
    expect(reloaded!.documentStructure!.length).toBe(1);
    expect(reloaded!.documentStructure![0].children.length).toBe(0);
    const collectionDocuments = await Document.findAndCountAll({
      where: {
        collectionId: collection.id,
      },
    });
    expect(collectionDocuments.count).toBe(1);
  });
});

describe("#membershipUserIds", () => {
  it("should return collection and group memberships", async () => {
    const team = await buildTeam();
    const teamId = team.id;
    // Make 6 users
    const users = await Promise.all(
      Array(6)
        .fill(undefined)
        .map(() =>
          buildUser({
            teamId,
          })
        )
    );
    const collection = await buildCollection({
      userId: users[0].id,
      permission: null,
      teamId,
    });
    const group1 = await buildGroup({
      teamId,
    });
    const group2 = await buildGroup({
      teamId,
    });
    const createdById = users[0].id;
    await group1.$add("user", users[0], {
      through: {
        createdById,
      },
    });
    await group1.$add("user", users[1], {
      through: {
        createdById,
      },
    });
    await group2.$add("user", users[2], {
      through: {
        createdById,
      },
    });
    await group2.$add("user", users[3], {
      through: {
        createdById,
      },
    });
    await collection.$add("user", users[4], {
      through: {
        createdById,
      },
    });
    await collection.$add("user", users[5], {
      through: {
        createdById,
      },
    });
    await collection.$add("group", group1, {
      through: {
        createdById,
      },
    });
    await collection.$add("group", group2, {
      through: {
        createdById,
      },
    });
    const membershipUserIds = await Collection.membershipUserIds(collection.id);
    expect(membershipUserIds.length).toBe(6);
  });
});

describe("#findByPk", () => {
  it("should return collection with collection Id", async () => {
    const collection = await buildCollection();
    const response = await Collection.findByPk(collection.id);
    expect(response!.id).toBe(collection.id);
  });

  it("should not allow a passed where to override the id", async () => {
    const collection = await buildCollection();
    const other = await buildCollection();

    const response = await Collection.findByPk(collection.id, {
      where: { id: other.id },
    });
    expect(response!.id).toBe(collection.id);

    const byUrlId = await Collection.findByPk(collection.urlId, {
      where: { urlId: other.urlId },
    });
    expect(byUrlId!.id).toBe(collection.id);
  });

  it("should throw the passed error when rejectOnEmpty is an error", async () => {
    const error = new Error("does not exist");
    await expect(
      Collection.findByPk("0e8280ea-7b4c-40e5-98ba-ec8a2f00f5e8", {
        rejectOnEmpty: error,
      })
    ).rejects.toThrow(error);
  });

  it("should not return documentStructure by default", async () => {
    const collection = await buildCollection();
    const response = await Collection.findByPk(collection.id);
    expect(() => response!.documentStructure).toThrow();
  });

  it("should return collection when urlId is present", async () => {
    const collection = await buildCollection();
    const id = `${slugify(collection.name)}-${collection.urlId}`;
    const response = await Collection.findByPk(id);
    expect(response!.id).toBe(collection.id);
  });

  it("should return collection when urlId is present, but missing slug", async () => {
    const collection = await buildCollection();
    const id = collection.urlId;
    const response = await Collection.findByPk(id);
    expect(response!.id).toBe(collection.id);
  });

  it("should return null when incorrect uuid type", async () => {
    const collection = await buildCollection();
    const response = await Collection.findByPk(collection.id + "-incorrect");
    expect(response).toBe(null);
  });

  it("should return null when incorrect urlId length", async () => {
    const collection = await buildCollection();
    const id = `${slugify(collection.name)}-${collection.urlId}incorrect`;
    const response = await Collection.findByPk(id);
    expect(response).toBe(null);
  });

  it("should return null when no collection is found with uuid", async () => {
    const response = await Collection.findByPk(
      "a9e71a81-7342-4ea3-9889-9b9cc8f667da"
    );
    expect(response).toBe(null);
  });

  it("should return null when no collection is found with urlId", async () => {
    const id = `${slugify("test collection")}-${randomString(15)}`;
    const response = await Collection.findByPk(id);
    expect(response).toBe(null);
  });
});

describe("#setIndex", () => {
  it("should set index before creating a collection", async () => {
    const collection = await buildCollection();
    expect(collection.index).not.toBeNull();
  });

  it("should resolve index collision when creating a collection", async () => {
    const collection = await buildCollection();
    const anotherCollection = await buildCollection({
      teamId: collection.teamId,
      index: collection.index,
    });
    expect(anotherCollection.index).not.toBeNull();
    expect(anotherCollection.index).not.toEqual(collection.index);
  });

  it("should ensure only transaction is used for finding the first collection for team", async () => {
    const collection = await buildCollection();
    const [anotherCollection] = await Collection.findOrCreate({
      where: {
        name: "Another collection",
        teamId: collection.teamId,
      },
      defaults: {
        createdById: collection.createdById,
        index: collection.index,
      },
    });
    expect(anotherCollection.index).not.toBeNull();
    expect(anotherCollection.index).not.toEqual(collection.index);
  });
});

describe("#archiveWithCtx", () => {
  it("should archive the collection and its non-archived documents", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const document = await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      publishedAt: new Date(),
    });
    const alreadyArchived = await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      publishedAt: new Date(),
      archivedAt: new Date("2024-01-01"),
    });

    await withAPIContext(user, (ctx) => collection.archiveWithCtx(ctx));

    await Promise.all([
      collection.reload(),
      document.reload(),
      alreadyArchived.reload(),
    ]);

    expect(collection.archivedAt).not.toBeNull();
    expect(collection.archivedById).toBe(user.id);
    expect(document.archivedAt).not.toBeNull();
    expect(document.archivedAt?.getTime()).toBe(
      collection.archivedAt!.getTime()
    );
    expect(document.lastModifiedById).toBe(user.id);
    // Previously-archived documents keep their original archivedAt timestamp.
    expect(alreadyArchived.archivedAt?.getTime()).toBe(
      new Date("2024-01-01").getTime()
    );
  });

  it("should leave documents in other collections untouched", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const otherCollection = await buildCollection({ teamId: team.id });
    const otherDocument = await buildDocument({
      collectionId: otherCollection.id,
      teamId: team.id,
      publishedAt: new Date(),
    });

    await withAPIContext(user, (ctx) => collection.archiveWithCtx(ctx));

    await otherDocument.reload();
    expect(otherDocument.archivedAt).toBeNull();
  });
});

describe("dataSchema", () => {
  const buildSchema = () => [
    {
      id: randomUUID(),
      name: "Status",
      type: PropertyType.Select,
      options: [
        { id: "todo", name: "To do" },
        { id: "done", name: "Done" },
      ],
    },
    {
      id: randomUUID(),
      name: "Priority",
      type: PropertyType.Number,
    },
  ];

  test("should not be a database by default", async () => {
    const collection = await buildCollection();
    expect(collection.isDatabase).toBe(false);
    expect(collection.dataSchema).toBe(null);
    expect(collection.views).toBe(null);
  });

  test("should be a database when a schema is set", async () => {
    const collection = await buildCollection({ dataSchema: buildSchema() });
    expect(collection.isDatabase).toBe(true);
  });

  test("should reject an invalid schema", async () => {
    const collection = await buildCollection();
    const missingFields = [{ id: "nope" }] as unknown as Property[];
    await expect(
      collection.update({ dataSchema: missingFields })
    ).rejects.toThrow();

    const unknownType = [
      { id: randomUUID(), name: "A", type: "formula" },
    ] as unknown as Property[];
    await expect(
      collection.update({ dataSchema: unknownType })
    ).rejects.toThrow();
  });

  test("should get, upsert and remove properties", async () => {
    const schema = buildSchema();
    const collection = await buildCollection({ dataSchema: schema });

    expect(collection.getProperty(schema[0].id)?.name).toBe("Status");
    expect(collection.getProperty(randomUUID())).toBeUndefined();

    const updated = { ...schema[0], name: "State" };
    collection.upsertProperty(updated);
    expect(collection.getProperty(schema[0].id)?.name).toBe("State");
    expect(collection.dataSchema?.length).toBe(2);

    const added = {
      id: randomUUID(),
      name: "Due",
      type: PropertyType.Date,
    };
    collection.upsertProperty(added);
    expect(collection.dataSchema?.length).toBe(3);

    collection.removeProperty(added.id);
    expect(collection.dataSchema?.length).toBe(2);

    await collection.save();
    expect(collection.getProperty(schema[0].id)?.name).toBe("State");
  });

  test("should remove view references when removing a property", async () => {
    const schema = buildSchema();
    const view = {
      id: randomUUID(),
      name: "Table",
      type: DataViewType.Table,
      columns: schema.map((property) => ({
        propertyId: property.id,
        visible: true,
      })),
      sorts: [{ propertyId: schema[0].id, direction: "asc" as const }],
      filter: {
        conjunction: "and" as const,
        conditions: [
          {
            propertyId: schema[0].id,
            operator: FilterOperator.Is,
            value: "todo",
          },
          {
            propertyId: schema[1].id,
            operator: FilterOperator.Gt,
            value: 1,
          },
        ],
      },
      groupBy: schema[0].id,
    };
    const collection = await buildCollection({
      dataSchema: schema,
      views: [view],
    });

    collection.removeProperty(schema[0].id);
    await collection.save();

    const saved = collection.getView(view.id);
    expect(saved?.columns).toEqual([
      { propertyId: schema[1].id, visible: true },
    ]);
    expect(saved?.sorts).toEqual([]);
    expect(saved?.filter).toEqual({
      conjunction: "and",
      conditions: [
        { propertyId: schema[1].id, operator: FilterOperator.Gt, value: 1 },
      ],
    });
    expect(saved?.groupBy).toBeUndefined();
  });
});

describe("views", () => {
  test("should reject invalid views", async () => {
    const collection = await buildCollection();
    const invalid = [{ id: "x" }] as unknown as DataView[];
    await expect(collection.update({ views: invalid })).rejects.toThrow();
  });

  test("should get, upsert and remove views", async () => {
    const collection = await buildCollection({ dataSchema: [] });
    const view = {
      id: randomUUID(),
      name: "All",
      type: DataViewType.Table,
      columns: [],
      sorts: [],
    };

    collection.upsertView(view);
    expect(collection.getView(view.id)?.name).toBe("All");

    collection.upsertView({ ...view, name: "Everything" });
    expect(collection.views?.length).toBe(1);
    expect(collection.getView(view.id)?.name).toBe("Everything");

    collection.removeView(view.id);
    expect(collection.views).toEqual([]);
  });

  test("defaultView should return the first saved view", async () => {
    const view = {
      id: randomUUID(),
      name: "Mine",
      type: DataViewType.Table,
      columns: [],
      sorts: [],
    };
    const collection = await buildCollection({
      dataSchema: [],
      views: [view],
    });
    expect(collection.defaultView().id).toBe(view.id);
  });

  test("defaultView should generate a table over all properties when none saved", async () => {
    const propertyId = randomUUID();
    const collection = await buildCollection({
      dataSchema: [{ id: propertyId, name: "Status", type: PropertyType.Text }],
    });
    const view = collection.defaultView();
    expect(view.type).toBe(DataViewType.Table);
    expect(view.columns).toEqual([{ propertyId, visible: true }]);
  });
});
