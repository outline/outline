import { format, subDays } from "date-fns";
import { Document, DocumentInsight } from "@server/models";
import { sequelize, sequelizeReadOnly } from "@server/storage/database";
import { buildDocument, buildTeam } from "@server/test/factories";
import UpdateDocumentsPopularityScoreTask from "./UpdateDocumentsPopularityScoreTask";

const props = {
  limit: 10000,
  partition: {
    partitionIndex: 0,
    partitionCount: 1,
  },
};

const today = () => format(new Date(), "yyyy-MM-dd");
const daysAgo = (n: number) => format(subDays(new Date(), n), "yyyy-MM-dd");

describe("UpdateDocumentsPopularityScoreTask", () => {
  let task: UpdateDocumentsPopularityScoreTask;

  beforeAll(() => {
    jest.setTimeout(30000);
  });

  beforeEach(async () => {
    task = new UpdateDocumentsPopularityScoreTask();

    // Clear leftover rollup rows from prior tests so the staleness guard
    // reflects only the data each test sets up.
    await DocumentInsight.destroy({ where: {}, force: true });

    // Ensure score query sees data created in tests by redirecting read
    // replica queries to the primary connection.
    if (sequelizeReadOnly !== sequelize) {
      jest
        .spyOn(sequelizeReadOnly, "query")
        .mockImplementation(sequelize.query.bind(sequelize));
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should skip when no fresh rollup data exists", async () => {
    const team = await buildTeam();
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });
    // Only stale rollup data (8 days old).
    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: daysAgo(8),
      viewCount: 100,
    });

    await task.perform(props);

    const updated = await Document.findByPk(document.id);
    expect(updated?.popularityScore).toBe(0);
  });

  it("should update score from rollup view counts", async () => {
    const team = await buildTeam();
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });
    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: daysAgo(1),
      viewCount: 10,
      viewerCount: 5,
    });

    await task.perform(props);

    const updated = await Document.findByPk(document.id);
    expect(updated?.popularityScore).toBeGreaterThan(0);
  });

  it("should update score from rollup revision counts", async () => {
    const team = await buildTeam();
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });
    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: daysAgo(1),
      revisionCount: 2,
      editorCount: 1,
    });

    await task.perform(props);

    const updated = await Document.findByPk(document.id);
    expect(updated?.popularityScore).toBeGreaterThan(0);
  });

  it("should weight comments and reactions above views", async () => {
    const team = await buildTeam();
    const viewDoc = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });
    const commentDoc = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    await DocumentInsight.create({
      documentId: viewDoc.id,
      teamId: team.id,
      date: today(),
      viewCount: 1,
    });
    await DocumentInsight.create({
      documentId: commentDoc.id,
      teamId: team.id,
      date: today(),
      commentCount: 1,
    });

    await task.perform(props);

    const updatedView = await Document.findByPk(viewDoc.id);
    const updatedComment = await Document.findByPk(commentDoc.id);

    expect(updatedComment?.popularityScore).toBeGreaterThan(
      updatedView?.popularityScore || 0
    );
  });

  it("should give higher score to more recent activity", async () => {
    const team = await buildTeam();
    const recent = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });
    const older = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    await DocumentInsight.create({
      documentId: recent.id,
      teamId: team.id,
      date: daysAgo(1),
      revisionCount: 1,
    });
    await DocumentInsight.create({
      documentId: older.id,
      teamId: team.id,
      date: daysAgo(7),
      revisionCount: 1,
    });
    // Include a fresh rollup row so the staleness guard passes.
    await DocumentInsight.create({
      documentId: recent.id,
      teamId: team.id,
      date: today(),
      viewCount: 0,
    });

    await task.perform(props);

    const updatedRecent = await Document.findByPk(recent.id);
    const updatedOlder = await Document.findByPk(older.id);

    expect(updatedRecent?.popularityScore).toBeGreaterThan(
      updatedOlder?.popularityScore || 0
    );
  });

  it("should exclude deleted documents", async () => {
    const team = await buildTeam();
    const deleted = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: new Date(),
    });
    await DocumentInsight.create({
      documentId: deleted.id,
      teamId: team.id,
      date: today(),
      revisionCount: 5,
    });

    await task.perform(props);

    const updated = await Document.unscoped().findByPk(deleted.id, {
      paranoid: false,
    });
    expect(Number(updated?.popularityScore)).toBe(0);
  });

  it("should include unpublished documents", async () => {
    const team = await buildTeam();
    const draft = await buildDocument({
      teamId: team.id,
      publishedAt: undefined,
    });
    await DocumentInsight.create({
      documentId: draft.id,
      teamId: team.id,
      date: today(),
      revisionCount: 3,
    });

    await task.perform(props);

    const updated = await Document.unscoped().findByPk(draft.id);
    expect(Number(updated?.popularityScore)).toBeGreaterThan(0);
  });
});
