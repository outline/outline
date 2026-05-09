import { format, subDays } from "date-fns";
import { DocumentInsight, Event, Reaction, Revision } from "@server/models";
import {
  buildComment,
  buildDocument,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import RollupDocumentInsightsTask from "./RollupDocumentInsightsTask";

const props = {
  limit: 10000,
  partition: {
    partitionIndex: 0,
    partitionCount: 1,
  },
};

vi.setConfig({ testTimeout: 30000 });

const daysAgo = (n: number) => subDays(new Date(), n);
const dayStr = (d: Date) => format(d, "yyyy-MM-dd");

describe("RollupDocumentInsightsTask", () => {
  let task: RollupDocumentInsightsTask;

  beforeEach(() => {
    task = new RollupDocumentInsightsTask();
  });

  it("writes nothing when no source activity exists", async () => {
    const team = await buildTeam();
    await buildDocument({ teamId: team.id });

    await task.perform(props);

    const count = await DocumentInsight.count({ where: { teamId: team.id } });
    expect(count).toBe(0);
  });

  it("rolls up view events into viewCount and viewerCount", async () => {
    const team = await buildTeam();
    const userA = await buildUser({ teamId: team.id });
    const userB = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    const yesterday = daysAgo(1);
    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: userA.id,
      documentId: document.id,
      createdAt: yesterday,
    });
    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: userA.id,
      documentId: document.id,
      createdAt: yesterday,
    });
    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: userB.id,
      documentId: document.id,
      createdAt: yesterday,
    });

    await task.perform(props);

    const insight = await DocumentInsight.findOne({
      where: { documentId: document.id, date: dayStr(yesterday) },
    });
    expect(insight).toBeTruthy();
    expect(insight!.viewCount).toBe(3);
    expect(insight!.viewerCount).toBe(2);
  });

  it("rolls up comments and reactions without double-counting", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    const yesterday = daysAgo(1);
    // Older comment that only receives a reaction yesterday.
    const olderComment = await buildComment({
      documentId: document.id,
      userId: user.id,
      createdAt: daysAgo(10),
    });

    // New comment yesterday.
    await buildComment({
      documentId: document.id,
      userId: user.id,
      createdAt: yesterday,
    });

    // Reaction on the older comment, but created yesterday.
    await Reaction.create(
      {
        emoji: "🎉",
        commentId: olderComment.id,
        userId: user.id,
        createdAt: yesterday,
      },
      { hooks: false }
    );

    await task.perform(props);

    const insight = await DocumentInsight.findOne({
      where: { documentId: document.id, date: dayStr(yesterday) },
    });
    expect(insight).toBeTruthy();
    expect(insight!.commentCount).toBe(1);
    expect(insight!.reactionCount).toBe(1);
  });

  it("rolls up revisions into revisionCount and editorCount", async () => {
    const team = await buildTeam();
    const userA = await buildUser({ teamId: team.id });
    const userB = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    const yesterday = daysAgo(1);
    await Revision.create({
      documentId: document.id,
      userId: userA.id,
      title: document.title,
      text: "A",
      createdAt: yesterday,
    });
    await Revision.create({
      documentId: document.id,
      userId: userA.id,
      title: document.title,
      text: "B",
      createdAt: yesterday,
    });
    await Revision.create({
      documentId: document.id,
      userId: userB.id,
      title: document.title,
      text: "C",
      createdAt: yesterday,
    });

    await task.perform(props);

    const insight = await DocumentInsight.findOne({
      where: { documentId: document.id, date: dayStr(yesterday) },
    });
    expect(insight).toBeTruthy();
    expect(insight!.revisionCount).toBe(3);
    expect(insight!.editorCount).toBe(2);
  });

  it("is idempotent when re-run for the same day", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    const yesterday = daysAgo(1);
    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
      createdAt: yesterday,
    });

    await task.perform(props);
    await task.perform(props);

    const rows = await DocumentInsight.findAll({
      where: { documentId: document.id, date: dayStr(yesterday) },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].viewCount).toBe(1);
  });

  it("excludes deleted documents", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: new Date(),
    });

    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
      createdAt: daysAgo(1),
    });

    await task.perform(props);

    const count = await DocumentInsight.count({
      where: { documentId: document.id },
    });
    expect(count).toBe(0);
  });

  it("includes unpublished documents", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const draft = await buildDocument({
      teamId: team.id,
      publishedAt: undefined,
    });

    await Revision.create({
      documentId: draft.id,
      userId: user.id,
      title: draft.title,
      text: "x",
      createdAt: daysAgo(1),
    });

    await task.perform(props);

    const insight = await DocumentInsight.findOne({
      where: { documentId: draft.id, date: dayStr(daysAgo(1)) },
    });
    expect(insight).toBeTruthy();
    expect(insight!.revisionCount).toBe(1);
  });
});
