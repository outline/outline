import { subDays } from "date-fns";
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

vi.setConfig({ testTimeout: 30000 });

const dayStr = (d: Date) => d.toISOString().slice(0, 10);

describe("UpdateDocumentsPopularityScoreTask", () => {
  let task: UpdateDocumentsPopularityScoreTask;

  beforeEach(() => {
    task = new UpdateDocumentsPopularityScoreTask();
    vi.spyOn(Date.prototype, "getHours").mockReturnValue(0);

    // Ensure calculation query sees data created in tests by redirecting to main sequelize instance.
    // We only mock if the instances are different to avoid infinite recursion.
    if (sequelizeReadOnly !== sequelize) {
      vi.spyOn(sequelizeReadOnly, "query").mockImplementation(
        sequelize.query.bind(sequelize)
      );
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should skip execution if not at a 12-hour interval", async () => {
    vi.spyOn(Date.prototype, "getHours").mockReturnValue(1);
    const team = await buildTeam();
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });
    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: dayStr(subDays(new Date(), 1)),
      revisionCount: 1,
    });

    await task.perform(props);

    const updatedDocument = await Document.findByPk(document.id);
    expect(updatedDocument?.popularityScore).toBe(0);
  });

  it("should update popularity score based on revision insights", async () => {
    const team = await buildTeam();
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: dayStr(subDays(new Date(), 1)),
      revisionCount: 3,
    });

    await task.perform(props);

    const updatedDocument = await Document.findByPk(document.id);
    expect(updatedDocument?.popularityScore).toBeGreaterThan(0);
  });

  it("should update popularity score based on view insights", async () => {
    const team = await buildTeam();
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: dayStr(new Date()),
      viewCount: 5,
    });

    await task.perform(props);

    const updatedDocument = await Document.findByPk(document.id);
    expect(updatedDocument?.popularityScore).toBeGreaterThan(0);
  });

  it("should update popularity score based on comment insights", async () => {
    const team = await buildTeam();
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: dayStr(new Date()),
      commentCount: 2,
    });

    await task.perform(props);

    const updatedDocument = await Document.findByPk(document.id);
    expect(updatedDocument?.popularityScore).toBeGreaterThan(0);
  });

  it("should update popularity score based on reaction insights", async () => {
    const team = await buildTeam();
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: dayStr(new Date()),
      reactionCount: 4,
    });

    await task.perform(props);

    const updatedDocument = await Document.findByPk(document.id);
    expect(updatedDocument?.popularityScore).toBeGreaterThan(0);
  });

  it("should give higher score to more recent activity", async () => {
    const team = await buildTeam();

    const doc1 = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });
    const doc2 = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    await DocumentInsight.create({
      documentId: doc1.id,
      teamId: team.id,
      date: dayStr(subDays(new Date(), 1)),
      revisionCount: 1,
    });

    await DocumentInsight.create({
      documentId: doc2.id,
      teamId: team.id,
      date: dayStr(subDays(new Date(), 5)),
      revisionCount: 1,
    });

    await task.perform(props);

    const updatedDoc1 = await Document.findByPk(doc1.id);
    const updatedDoc2 = await Document.findByPk(doc2.id);

    expect(updatedDoc1?.popularityScore).toBeGreaterThan(
      updatedDoc2?.popularityScore || 0
    );
  });

  it("should sum activity across multiple days within the threshold window", async () => {
    const team = await buildTeam();
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: dayStr(subDays(new Date(), 1)),
      viewCount: 2,
      commentCount: 1,
    });
    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: dayStr(subDays(new Date(), 3)),
      viewCount: 3,
      revisionCount: 1,
    });

    await task.perform(props);

    const updatedDocument = await Document.findByPk(document.id);
    expect(updatedDocument?.popularityScore).toBeGreaterThan(0);
  });

  it("should ignore insights outside the threshold window", async () => {
    const team = await buildTeam();
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: dayStr(subDays(new Date(), 60)),
      viewCount: 100,
    });

    await task.perform(props);

    const updatedDocument = await Document.findByPk(document.id);
    expect(Number(updatedDocument?.popularityScore)).toBe(0);
  });

  it("should reset score to zero when activity falls outside the window", async () => {
    const team = await buildTeam();
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    // Simulate a previously-computed non-zero score with no current activity
    await document.update({ popularityScore: 5.2 });

    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: dayStr(subDays(new Date(), 60)),
      viewCount: 100,
    });

    await task.perform(props);

    const updatedDocument = await Document.findByPk(document.id);
    expect(Number(updatedDocument?.popularityScore)).toBe(0);
  });

  it("should only process published and non-deleted documents", async () => {
    const team = await buildTeam();

    const draft = await buildDocument({
      teamId: team.id,
      publishedAt: undefined,
    });
    await DocumentInsight.create({
      documentId: draft.id,
      teamId: team.id,
      date: dayStr(new Date()),
      revisionCount: 1,
    });

    const deleted = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: new Date(),
    });
    await DocumentInsight.create({
      documentId: deleted.id,
      teamId: team.id,
      date: dayStr(new Date()),
      revisionCount: 1,
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
