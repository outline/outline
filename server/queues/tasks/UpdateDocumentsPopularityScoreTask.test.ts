import { subDays } from "date-fns";
import { Document, Revision, View } from "@server/models";
import { sequelize, sequelizeReadOnly } from "@server/storage/database";
import {
  buildDocument,
  buildTeam,
  buildUser,
  buildComment,
} from "@server/test/factories";
import UpdateDocumentsPopularityScoreTask from "./UpdateDocumentsPopularityScoreTask";

const props = {
  limit: 10000,
  partition: {
    partitionIndex: 0,
    partitionCount: 1,
  },
};

describe("UpdateDocumentsPopularityScoreTask", () => {
  let task: UpdateDocumentsPopularityScoreTask;

  beforeAll(() => {
    jest.setTimeout(30000);
  });

  beforeEach(() => {
    task = new UpdateDocumentsPopularityScoreTask();
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(0);

    // Ensure calculation query sees data created in tests by redirecting to main sequelize instance.
    // We only mock if the instances are different to avoid infinite recursion.
    if (sequelizeReadOnly !== sequelize) {
      jest
        .spyOn(sequelizeReadOnly, "query")
        .mockImplementation(sequelize.query.bind(sequelize));
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should skip execution if not at a 6-hour interval", async () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(1);
    const team = await buildTeam();
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    await task.perform(props);

    const updatedDocument = await Document.findByPk(document.id);
    expect(updatedDocument?.popularityScore).toBe(0);
  });

  it("should update popularity score based on revisions", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    await Revision.create({
      documentId: document.id,
      userId: user.id,
      title: document.title,
      text: "Content",
      createdAt: subDays(new Date(), 1),
    });

    await task.perform(props);

    const updatedDocument = await Document.findByPk(document.id);
    expect(updatedDocument?.popularityScore).toBeGreaterThan(0);
  });

  it("should update popularity score based on views", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    await View.create({
      documentId: document.id,
      userId: user.id,
    });

    await task.perform(props);

    const updatedDocument = await Document.findByPk(document.id);
    expect(updatedDocument?.popularityScore).toBeGreaterThan(0);
  });

  it("should update popularity score based on comments", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    await buildComment({
      documentId: document.id,
      userId: user.id,
    });

    await task.perform(props);

    const updatedDocument = await Document.findByPk(document.id);
    expect(updatedDocument?.popularityScore).toBeGreaterThan(0);
  });

  it("should handle multiple documents and give higher score to more recent activity", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    const doc1 = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });
    const doc2 = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    // Recent activity for doc1
    await Revision.create({
      documentId: doc1.id,
      userId: user.id,
      title: doc1.title,
      text: "Content",
      createdAt: subDays(new Date(), 1),
    });

    // Older activity for doc2
    await Revision.create({
      documentId: doc2.id,
      userId: user.id,
      title: doc2.title,
      text: "Content",
      createdAt: subDays(new Date(), 5),
    });

    await task.perform(props);

    const updatedDoc1 = await Document.findByPk(doc1.id);
    const updatedDoc2 = await Document.findByPk(doc2.id);

    expect(updatedDoc1?.popularityScore).toBeGreaterThan(
      updatedDoc2?.popularityScore || 0
    );
  });

  it("should only process published and non-deleted documents", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    // Unpublished document (draft)
    const draft = await buildDocument({
      teamId: team.id,
      publishedAt: undefined,
    });
    await Revision.create({
      documentId: draft.id,
      userId: user.id,
      title: draft.title,
      text: "Content",
      createdAt: new Date(),
    });

    // Deleted document
    const deleted = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: new Date(),
    });
    await Revision.create({
      documentId: deleted.id,
      userId: user.id,
      title: deleted.title,
      text: "Content",
      createdAt: new Date(),
    });

    await task.perform(props);

    const updatedDraft = await Document.unscoped().findByPk(draft.id);
    const updatedDeleted = await Document.unscoped().findByPk(deleted.id, {
      paranoid: false,
    });

    expect(Number(updatedDraft?.popularityScore)).toEqual(0);
    expect(Number(updatedDeleted?.popularityScore)).toEqual(0);
  });
});
