import { EmptyResultError, Op } from "sequelize";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import slugify from "@shared/utils/slugify";
import { parser } from "@server/editor";
import Document from "@server/models/Document";
import {
  buildDocument,
  buildDraftDocument,
  buildCollection,
  buildComment,
  buildResolvedComment,
  buildGroup,
  buildTeam,
  buildUser,
  buildGuestUser,
} from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import GroupMembership from "./GroupMembership";
import GroupUser from "./GroupUser";
import UserMembership from "./UserMembership";

beforeEach(() => {
  vi.resetAllMocks();
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

describe("#destroyWithCtx", () => {
  test("should soft delete and set last modified", async () => {
    const document = await buildDocument();
    const user = await buildUser();
    await withAPIContext(user, (ctx) => document.destroyWithCtx(ctx));

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
    await withAPIContext(user, (ctx) => document.destroyWithCtx(ctx));
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

    await withAPIContext(user, (ctx) => document.destroyWithCtx(ctx));
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
    await withAPIContext(user, (ctx) => document.destroyWithCtx(ctx));
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

  test("should apply where filter and prune unmatched branches", async () => {
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
    const publishedChild = await buildDocument({
      userId: user.id,
      teamId: team.id,
      collectionId: collection.id,
      parentDocumentId: document.id,
      title: "published",
    });
    // A draft (unpublished) child, with its own nested child.
    const draftChild = await buildDraftDocument({
      userId: user.id,
      teamId: team.id,
      collectionId: collection.id,
      parentDocumentId: document.id,
      title: "draft",
    });
    await buildDocument({
      userId: user.id,
      teamId: team.id,
      collectionId: collection.id,
      parentDocumentId: draftChild.id,
      title: "published under draft",
    });

    const results = await document.findAllChildDocumentIds({
      publishedAt: {
        [Op.ne]: null,
      },
    });
    // Only the published child is returned; the draft branch is pruned so its
    // descendants are not traversed.
    expect(results).toEqual([publishedChild.id]);
  });

  test("should include soft-deleted children when paranoid is false", async () => {
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
    const child = await buildDocument({
      userId: user.id,
      teamId: team.id,
      collectionId: collection.id,
      parentDocumentId: document.id,
      title: "child",
    });
    await child.destroy();

    expect(await document.findAllChildDocumentIds()).toEqual([]);
    expect(
      await document.findAllChildDocumentIds(undefined, { paranoid: false })
    ).toEqual([child.id]);
  });
});

describe("#membershipDocumentIds", () => {
  it("should return empty array when the user has no document memberships", async () => {
    const user = await buildUser();
    const ids = await Document.membershipDocumentIds(user.id);
    expect(ids).toEqual([]);
  });

  it("should return documents shared directly with the user", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const otherUser = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: otherUser.id,
    });
    await UserMembership.create({
      createdById: otherUser.id,
      documentId: document.id,
      userId: user.id,
      permission: DocumentPermission.Read,
    });

    const ids = await Document.membershipDocumentIds(user.id);
    expect(ids).toEqual([document.id]);
  });

  it("should return documents shared with the user through a group", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const otherUser = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: otherUser.id,
    });
    const group = await buildGroup({ teamId: team.id });
    await group.$add("user", user, { through: { createdById: otherUser.id } });
    await GroupMembership.create({
      createdById: otherUser.id,
      groupId: group.id,
      documentId: document.id,
      permission: DocumentPermission.Read,
    });

    const ids = await Document.membershipDocumentIds(user.id);
    expect(ids).toEqual([document.id]);
  });

  it("should deduplicate documents shared both directly and through a group", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const otherUser = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: otherUser.id,
    });
    await UserMembership.create({
      createdById: otherUser.id,
      documentId: document.id,
      userId: user.id,
      permission: DocumentPermission.Read,
    });
    const group = await buildGroup({ teamId: team.id });
    await group.$add("user", user, { through: { createdById: otherUser.id } });
    await GroupMembership.create({
      createdById: otherUser.id,
      groupId: group.id,
      documentId: document.id,
      permission: DocumentPermission.Read,
    });

    const ids = await Document.membershipDocumentIds(user.id);
    expect(ids).toEqual([document.id]);
  });

  it("should not return memberships of other users or collections", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const otherUser = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: otherUser.id,
    });
    const document = await buildDocument({
      teamId: team.id,
      userId: otherUser.id,
      collectionId: collection.id,
    });
    // document membership for another user
    await UserMembership.create({
      createdById: otherUser.id,
      documentId: document.id,
      userId: otherUser.id,
      permission: DocumentPermission.Read,
    });
    // collection-level membership for this user
    await UserMembership.create({
      createdById: otherUser.id,
      collectionId: collection.id,
      userId: user.id,
      permission: CollectionPermission.Read,
    });

    const ids = await Document.membershipDocumentIds(user.id);
    expect(ids).toEqual([]);
  });

  it("should not return documents from deleted group memberships", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const otherUser = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: otherUser.id,
    });
    const group = await buildGroup({ teamId: team.id });
    await group.$add("user", user, { through: { createdById: otherUser.id } });
    const membership = await GroupMembership.create({
      createdById: otherUser.id,
      groupId: group.id,
      documentId: document.id,
      permission: DocumentPermission.Read,
    });
    await membership.destroy();

    const ids = await Document.membershipDocumentIds(user.id);
    expect(ids).toEqual([]);
  });

  it("should invalidate the cache when a direct membership is added or removed", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const otherUser = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: otherUser.id,
    });

    expect(await Document.membershipDocumentIds(user.id)).toEqual([]);

    const membership = await UserMembership.create({
      createdById: otherUser.id,
      documentId: document.id,
      userId: user.id,
      permission: DocumentPermission.Read,
    });
    expect(await Document.membershipDocumentIds(user.id)).toEqual([
      document.id,
    ]);

    await membership.destroy();
    expect(await Document.membershipDocumentIds(user.id)).toEqual([]);
  });

  it("should invalidate the cache when a group membership is added or removed", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const otherUser = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: otherUser.id,
    });
    const group = await buildGroup({ teamId: team.id });
    await group.$add("user", user, { through: { createdById: otherUser.id } });

    expect(await Document.membershipDocumentIds(user.id)).toEqual([]);

    const membership = await GroupMembership.create({
      createdById: otherUser.id,
      groupId: group.id,
      documentId: document.id,
      permission: DocumentPermission.Read,
    });
    expect(await Document.membershipDocumentIds(user.id)).toEqual([
      document.id,
    ]);

    await membership.destroy();
    expect(await Document.membershipDocumentIds(user.id)).toEqual([]);
  });

  it("should invalidate the cache when the user joins or leaves a group", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const otherUser = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: otherUser.id,
    });
    const group = await buildGroup({ teamId: team.id });
    await GroupMembership.create({
      createdById: otherUser.id,
      groupId: group.id,
      documentId: document.id,
      permission: DocumentPermission.Read,
    });

    expect(await Document.membershipDocumentIds(user.id)).toEqual([]);

    const groupUser = await GroupUser.create({
      groupId: group.id,
      userId: user.id,
      createdById: otherUser.id,
    });
    expect(await Document.membershipDocumentIds(user.id)).toEqual([
      document.id,
    ]);

    await groupUser.destroy();
    expect(await Document.membershipDocumentIds(user.id)).toEqual([]);
  });

  it("should read through to the database when skipCache is set", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const otherUser = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: otherUser.id,
    });

    expect(await Document.membershipDocumentIds(user.id)).toEqual([]);

    await UserMembership.create({
      createdById: otherUser.id,
      documentId: document.id,
      userId: user.id,
      permission: DocumentPermission.Read,
    });

    expect(
      await Document.membershipDocumentIds(user.id, { skipCache: true })
    ).toEqual([document.id]);
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

  it("should omit content columns when includeContent is false", async () => {
    const document = await buildDocument({ text: "# Heading" });

    const response = await Document.findByPk(document.id, {
      includeContent: false,
    });
    expect(response?.id).toBe(document.id);
    expect(response?.title).toBe(document.title);
    expect(response?.dataValues.content).toBeUndefined();
    expect(response?.dataValues.text).toBeUndefined();
    expect(response?.dataValues.state).toBeUndefined();

    const withContent = await Document.findByPk(document.id);
    expect(withContent?.dataValues.content).toBeDefined();
    expect(withContent?.dataValues.text).toBeDefined();
  });

  it("should not allow a passed where to override the id", async () => {
    const document = await buildDocument();
    const other = await buildDocument();

    const response = await Document.findByPk(document.id, {
      where: { id: other.id },
    });
    expect(response?.id).toBe(document.id);

    const byUrlId = await Document.findByPk(document.urlId, {
      where: { urlId: other.urlId },
    });
    expect(byUrlId?.id).toBe(document.id);
  });

  it("should throw the passed error when rejectOnEmpty is an error", async () => {
    const error = new Error("does not exist");
    await expect(
      Document.findByPk("0e8280ea-7b4c-40e5-98ba-ec8a2f00f5e8", {
        rejectOnEmpty: error,
      })
    ).rejects.toThrow(error);
  });

  it("should load state as a fallback when content is empty", async () => {
    const state = Buffer.from([1, 2, 3]);
    const document = await buildDocument();
    await Document.unscoped().update(
      { content: null, state },
      { where: { id: document.id }, hooks: false, silent: true }
    );

    const response = await Document.findByPk(document.id);
    expect(response?.state).toEqual(state);
  });

  it("should not load state when content is available", async () => {
    const document = await buildDocument();
    const response = await Document.findByPk(document.id);
    expect(response?.content).toBeTruthy();
    expect(response?.state).toBeNull();
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

  it("should not return another user's unfiled draft", async () => {
    const team = await buildTeam();
    const author = await buildUser({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const draft = await buildDraftDocument({
      teamId: team.id,
      userId: author.id,
      collectionId: null,
    });
    const documents = await Document.findByIds([draft.id], {
      userId: user.id,
    });
    expect(documents.length).toBe(0);
  });

  it("should return the user's own unfiled draft", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const draft = await buildDraftDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: null,
    });
    const documents = await Document.findByIds([draft.id], {
      userId: user.id,
    });
    expect(documents.length).toBe(1);
  });

  it("should return an unfiled draft shared with the user", async () => {
    const team = await buildTeam();
    const author = await buildUser({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const draft = await buildDraftDocument({
      teamId: team.id,
      userId: author.id,
      collectionId: null,
    });
    await UserMembership.create({
      createdById: author.id,
      documentId: draft.id,
      userId: user.id,
      permission: DocumentPermission.Read,
    });
    const documents = await Document.findByIds([draft.id], {
      userId: user.id,
    });
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

describe("commentCount", () => {
  it("returns 0 for a document with no comments", async () => {
    const document = await buildDocument();
    expect(await document.commentCount).toEqual(0);
  });

  it("counts unresolved threads and their replies", async () => {
    const document = await buildDocument();
    const thread = await buildComment({
      documentId: document.id,
      userId: document.createdById,
    });
    await buildComment({
      documentId: document.id,
      userId: document.createdById,
      parentCommentId: thread.id,
    });
    expect(await document.commentCount).toEqual(2);
  });

  it("excludes resolved threads and their replies", async () => {
    const document = await buildDocument();
    const user = await buildUser({ teamId: document.teamId });
    const resolved = await buildResolvedComment(user, {
      documentId: document.id,
      userId: user.id,
    });
    await buildComment({
      documentId: document.id,
      userId: user.id,
      parentCommentId: resolved.id,
    });
    await buildComment({
      documentId: document.id,
      userId: user.id,
    });
    expect(await document.commentCount).toEqual(1);
  });

  it("invalidates the cached count when a comment is destroyed", async () => {
    const document = await buildDocument();
    const comment = await buildComment({
      documentId: document.id,
      userId: document.createdById,
    });
    await buildComment({
      documentId: document.id,
      userId: document.createdById,
    });

    expect(await document.commentCount).toEqual(2);

    await comment.destroy();

    expect(await document.commentCount).toEqual(1);
  });

  it("invalidates the cached count when a thread is resolved", async () => {
    const document = await buildDocument();
    const user = await buildUser({ teamId: document.teamId });
    const thread = await buildComment({
      documentId: document.id,
      userId: user.id,
    });
    await buildComment({
      documentId: document.id,
      userId: user.id,
      parentCommentId: thread.id,
    });

    // Prime the cache.
    expect(await document.commentCount).toEqual(2);

    thread.resolve(user);
    await thread.save();

    expect(await document.commentCount).toEqual(0);
  });

  it("invalidates the cached count when a resolved thread is unresolved", async () => {
    const document = await buildDocument();
    const user = await buildUser({ teamId: document.teamId });
    const thread = await buildResolvedComment(user, {
      documentId: document.id,
      userId: user.id,
    });

    // Prime the cache (resolved thread is excluded).
    expect(await document.commentCount).toEqual(0);

    thread.unresolve();
    await thread.save();

    expect(await document.commentCount).toEqual(1);
  });
});
