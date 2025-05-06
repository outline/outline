import { EmptyResultError } from "sequelize";
import { CollectionPermission } from "@shared/types";
import slugify from "@shared/utils/slugify";
import { parser } from "@server/editor";
import Document from "@server/models/Document";
import {
  buildDocument,
  buildDraftDocument,
  buildCollection,
  buildTeam,
  buildUser,
  buildGuestUser,
} from "@server/test/factories";
import UserMembership from "./UserMembership";

beforeEach(() => {
  jest.resetAllMocks();
});

describe("#getSummary", () => {
  test("should strip markdown", async () => {
    const document = await buildDocument({
      version: 1,
      text: `*paragraph*

paragraph 2`,
    });
    expect(document.getSummary()).toBe("paragraph");
  });

  test("should strip title when no version", async () => {
    const document = await buildDocument({
      version: 0,
      text: `# Heading

*paragraph*`,
    });
    expect(document.getSummary()).toBe("paragraph");
  });
});

describe("#delete", () => {
  test("should soft delete and set last modified", async () => {
    const document = await buildDocument();
    const user = await buildUser();
    await document.delete(user);

    const newDocument = await Document.findByPk(document.id, {
      paranoid: false,
    });
    expect(newDocument?.lastModifiedById).toBe(user.id);
    expect(newDocument?.deletedAt).toBeTruthy();
  });

  test("should soft delete templates", async () => {
    const document = await buildDocument({
      template: true,
    });
    const user = await buildUser();
    await document.delete(user);
    const newDocument = await Document.findByPk(document.id, {
      paranoid: false,
    });
    expect(newDocument?.lastModifiedById).toBe(user.id);
    expect(newDocument?.deletedAt).toBeTruthy();
  });

  test("should soft delete archived", async () => {
    const document = await buildDocument({
      archivedAt: new Date(),
    });
    const user = await buildUser();
    await document.delete(user);
    const newDocument = await Document.findByPk(document.id, {
      paranoid: false,
    });
    expect(newDocument?.lastModifiedById).toBe(user.id);
    expect(newDocument?.deletedAt).toBeTruthy();
  });

  test("should soft delete archived document in an archived collection", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      archivedAt: new Date(),
      createdById: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      archivedAt: new Date(),
      collectionId: collection.id,
      userId: user.id,
      teamId: user.teamId,
    });
    await collection.addDocumentToStructure(document, 0);

    await document.delete(user);
    const [newDocument, newCollection] = await Promise.all([
      document.reload({ paranoid: false }),
      collection.reload(),
    ]);

    expect(newDocument?.lastModifiedById).toEqual(user.id);
    expect(newDocument?.deletedAt).toBeTruthy();
    expect(newCollection?.documentStructure).toEqual([]);
  });

  it("should delete draft without collection", async () => {
    const user = await buildUser();
    const document = await buildDraftDocument();
    await document.delete(user);
    const deletedDocument = await Document.findByPk(document.id, {
      paranoid: false,
    });
    expect(deletedDocument?.lastModifiedById).toBe(user.id);
    expect(deletedDocument?.deletedAt).toBeTruthy();
  });
});

describe("#save", () => {
  test("should have empty previousTitles by default", async () => {
    const document = await buildDocument();
    expect(document.previousTitles).toBe(null);
  });

  test("should include previousTitles on save", async () => {
    const document = await buildDocument();
    document.title = "test";
    await document.save();
    expect(document.previousTitles.length).toBe(1);
  });

  test("should not duplicate previousTitles", async () => {
    const document = await buildDocument();
    document.title = "test";
    await document.save();
    document.title = "example";
    await document.save();
    document.title = "test";
    await document.save();
    expect(document.previousTitles.length).toBe(3);
  });
});

describe("#findAllChildDocumentIds", () => {
  test("should return empty array if no children", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      teamId: team.id,
      collectionId: collection.id,
      title: "test",
    });
    const results = await document.findAllChildDocumentIds();
    expect(results.length).toBe(0);
  });

  test("should return nested child document ids", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      teamId: team.id,
      collectionId: collection.id,
      title: "test",
    });
    const document2 = await buildDocument({
      userId: user.id,
      teamId: team.id,
      collectionId: collection.id,
      parentDocumentId: document.id,
      title: "test",
    });
    const document3 = await buildDocument({
      userId: user.id,
      teamId: team.id,
      collectionId: collection.id,
      parentDocumentId: document2.id,
      title: "test",
    });
    const results = await document.findAllChildDocumentIds();
    expect(results.length).toBe(2);
    expect(results[0]).toBe(document2.id);
    expect(results[1]).toBe(document3.id);
  });
});

describe("#findByPk", () => {
  test("should return document when urlId is correct", async () => {
    const document = await buildDocument();
    const id = `${slugify(document.title)}-${document.urlId}`;
    const response = await Document.findByPk(id);
    expect(response?.id).toBe(document.id);
  });

  test("should return document when urlId is given without the slug prefix", async () => {
    const document = await buildDocument();
    const id = document.urlId;
    const response = await Document.findByPk(id);
    expect(response?.id).toBe(document.id);
  });

  it("should test with rejectOnEmpty flag", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      createdById: user.id,
    });
    await expect(
      Document.findByPk(document.id, {
        userId: user.id,
        rejectOnEmpty: true,
      })
    ).resolves.not.toBeNull();

    await expect(
      Document.findByPk(document.urlId, {
        userId: user.id,
        rejectOnEmpty: true,
      })
    ).resolves.not.toBeNull();

    await expect(
      Document.findByPk("0e8280ea-7b4c-40e5-98ba-ec8a2f00f5e8", {
        userId: user.id,
        rejectOnEmpty: true,
      })
    ).rejects.toThrow(EmptyResultError);
  });
});

describe("findByIds", () => {
  test("should return documents by ids", async () => {
    const document1 = await buildDocument();
    const document2 = await buildDocument();
    const documents = await Document.findByIds([document1.id, document2.id]);
    expect(documents.length).toBe(2);
  });

  test("should return documents filtered to user access", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document1 = await buildDocument({ teamId: team.id });
    const document2 = await buildDocument({ teamId: team.id });
    const document3 = await buildDocument();
    const documents = await Document.findByIds(
      [document1.id, document2.id, document3.id],
      {
        userId: user.id,
      }
    );
    expect(documents.length).toBe(2);
  });

  test("should return documents filtered to private collection access", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    const document1 = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    const document2 = await buildDocument({ teamId: team.id });
    const document3 = await buildDocument();
    const documents = await Document.findByIds(
      [document1.id, document2.id, document3.id],
      {
        userId: user.id,
      }
    );
    expect(documents.length).toBe(1);
  });

  test("should return documents filtered to guest access", async () => {
    const team = await buildTeam();
    const user = await buildGuestUser({ teamId: team.id });
    const document1 = await buildDocument({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    await UserMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: CollectionPermission.Read,
    });
    const document2 = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    const document3 = await buildDocument();
    const documents = await Document.findByIds(
      [document1.id, document2.id, document3.id],
      {
        userId: user.id,
      }
    );
    expect(documents.length).toBe(1);
  });
});

describe("tasks", () => {
  test("should return tasks keys set to 0 if check items isn't present", async () => {
    const document = await buildDocument({
      text: `text`,
    });
    const tasks = document.tasks;
    expect(tasks.completed).toBe(0);
    expect(tasks.total).toBe(0);
  });

  test("should return tasks keys set to 0 if the text contains broken check items", async () => {
    const document = await buildDocument({
      text: `
- [x ] test
- [ x ] test
- [  ] test`,
    });
    const tasks = document.tasks;
    expect(tasks.completed).toBe(0);
    expect(tasks.total).toBe(0);
  });

  test("should return tasks", async () => {
    const document = await buildDocument({
      text: `
- [x] list item
- [ ] list item`,
    });
    const tasks = document.tasks;
    expect(tasks.completed).toBe(1);
    expect(tasks.total).toBe(2);
  });

  test("should update tasks on save", async () => {
    const document = await buildDocument({
      text: `
- [x] list item
- [ ] list item`,
    });
    const tasks = document.tasks;
    expect(tasks.completed).toBe(1);
    expect(tasks.total).toBe(2);
    document.content = parser
      .parse(
        `
- [x] list item
- [ ] list item
- [ ] list item`
      )
      ?.toJSON();
    await document.save();
    const newTasks = document.tasks;
    expect(newTasks.completed).toBe(1);
    expect(newTasks.total).toBe(3);
  });
});
