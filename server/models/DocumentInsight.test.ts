import { format, startOfISOWeek, subDays } from "date-fns";
import DocumentInsight, {
  DocumentInsightPeriod,
} from "@server/models/DocumentInsight";
import { Comment, Event, Revision } from "@server/models";
import { buildDocument, buildTeam, buildUser } from "@server/test/factories";

const FULL_UUID_RANGE: [string, string] = [
  "00000000-0000-4000-8000-000000000000",
  "ffffffff-ffff-4fff-bfff-ffffffffffff",
];

const dayStr = (d: Date) => format(d, "yyyy-MM-dd");

describe("DocumentInsight.rollupPeriod", () => {
  it("writes nothing when no source activity exists in the window", async () => {
    const team = await buildTeam();
    await buildDocument({ teamId: team.id });

    const upserted = await DocumentInsight.rollupPeriod({
      periodStart: dayStr(subDays(new Date(), 1)),
      intervalDays: 1,
      period: DocumentInsightPeriod.Day,
      startUuid: FULL_UUID_RANGE[0],
      endUuid: FULL_UUID_RANGE[1],
    });

    expect(upserted).toBe(0);
    expect(await DocumentInsight.count({ where: { teamId: team.id } })).toBe(0);
  });

  it("respects the window boundaries and excludes events outside it", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    const target = subDays(new Date(), 10);
    const before = subDays(target, 1);
    const after = subDays(target, -1);

    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
      createdAt: before,
    });
    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
      createdAt: target,
    });
    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
      createdAt: after,
    });

    await DocumentInsight.rollupPeriod({
      periodStart: dayStr(target),
      intervalDays: 1,
      period: DocumentInsightPeriod.Day,
      startUuid: FULL_UUID_RANGE[0],
      endUuid: FULL_UUID_RANGE[1],
    });

    const row = await DocumentInsight.findOne({
      where: { documentId: document.id, date: dayStr(target) },
    });
    expect(row).toBeTruthy();
    expect(row!.period).toBe(DocumentInsightPeriod.Day);
    expect(row!.viewCount).toBe(1);
  });

  it("aggregates a 7-day window into a single weekly row", async () => {
    const team = await buildTeam();
    const userA = await buildUser({ teamId: team.id });
    const userB = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    const weekStart = startOfISOWeek(subDays(new Date(), 60));

    // Views across multiple days of the same week; userA on two days, userB on one.
    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: userA.id,
      documentId: document.id,
      createdAt: subDays(weekStart, -1), // Tuesday
    });
    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: userA.id,
      documentId: document.id,
      createdAt: subDays(weekStart, -3), // Thursday
    });
    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: userB.id,
      documentId: document.id,
      createdAt: subDays(weekStart, -5), // Saturday
    });

    // Revision within the week by userB.
    await Revision.create({
      documentId: document.id,
      userId: userB.id,
      title: document.title,
      text: "x",
      createdAt: subDays(weekStart, -2),
    });

    await DocumentInsight.rollupPeriod({
      periodStart: dayStr(weekStart),
      intervalDays: 7,
      period: DocumentInsightPeriod.Week,
      startUuid: FULL_UUID_RANGE[0],
      endUuid: FULL_UUID_RANGE[1],
    });

    const rows = await DocumentInsight.findAll({
      where: { documentId: document.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].period).toBe(DocumentInsightPeriod.Week);
    expect(rows[0].date).toBe(dayStr(weekStart));
    expect(rows[0].viewCount).toBe(3);
    // Two distinct viewers across the week, not double-counted by day.
    expect(rows[0].viewerCount).toBe(2);
    expect(rows[0].revisionCount).toBe(1);
    expect(rows[0].editorCount).toBe(1);
  });

  it("counts reactions on older comments when the reaction is in-window", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    const target = subDays(new Date(), 2);
    const olderComment = await Comment.create({
      documentId: document.id,
      createdById: user.id,
      data: { type: "doc", content: [] },
      createdAt: subDays(target, 30),
    });

    const { Reaction } = await import("@server/models");
    await Reaction.create(
      {
        emoji: "🎉",
        commentId: olderComment.id,
        userId: user.id,
        createdAt: target,
      },
      { hooks: false }
    );

    await DocumentInsight.rollupPeriod({
      periodStart: dayStr(target),
      intervalDays: 1,
      period: DocumentInsightPeriod.Day,
      startUuid: FULL_UUID_RANGE[0],
      endUuid: FULL_UUID_RANGE[1],
    });

    const row = await DocumentInsight.findOne({
      where: { documentId: document.id, date: dayStr(target) },
    });
    expect(row).toBeTruthy();
    expect(row!.commentCount).toBe(0);
    expect(row!.reactionCount).toBe(1);
  });

  it("skips documents outside the partition UUID range", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    const target = subDays(new Date(), 1);
    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
      createdAt: target,
    });

    // An empty range that excludes all documents.
    const [bogusStart, bogusEnd] = [
      "ffffffff-ffff-4fff-bfff-fffffffffffe",
      "ffffffff-ffff-4fff-bfff-ffffffffffff",
    ];
    // Only hits if the test document's UUID happens to fall in the range; in
    // practice buildDocument generates a random v4 that won't. Assert that
    // the rollup writes nothing for this document.
    const upserted = await DocumentInsight.rollupPeriod({
      periodStart: dayStr(target),
      intervalDays: 1,
      period: DocumentInsightPeriod.Day,
      startUuid: bogusStart,
      endUuid: bogusEnd,
    });

    expect(upserted).toBe(0);
    expect(
      await DocumentInsight.count({ where: { documentId: document.id } })
    ).toBe(0);
  });

  it("upserts on (documentId, date, period) and updates counts on re-run", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    const target = subDays(new Date(), 1);
    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
      createdAt: target,
    });

    await DocumentInsight.rollupPeriod({
      periodStart: dayStr(target),
      intervalDays: 1,
      period: DocumentInsightPeriod.Day,
      startUuid: FULL_UUID_RANGE[0],
      endUuid: FULL_UUID_RANGE[1],
    });

    // Add another event and re-run.
    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
      createdAt: target,
    });

    await DocumentInsight.rollupPeriod({
      periodStart: dayStr(target),
      intervalDays: 1,
      period: DocumentInsightPeriod.Day,
      startUuid: FULL_UUID_RANGE[0],
      endUuid: FULL_UUID_RANGE[1],
    });

    const rows = await DocumentInsight.findAll({
      where: { documentId: document.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].viewCount).toBe(2);
  });

  it("stores daily and weekly rows for the same start date side-by-side", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    const weekStart = startOfISOWeek(subDays(new Date(), 60));
    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
      createdAt: weekStart,
    });

    await DocumentInsight.rollupPeriod({
      periodStart: dayStr(weekStart),
      intervalDays: 1,
      period: DocumentInsightPeriod.Day,
      startUuid: FULL_UUID_RANGE[0],
      endUuid: FULL_UUID_RANGE[1],
    });
    await DocumentInsight.rollupPeriod({
      periodStart: dayStr(weekStart),
      intervalDays: 7,
      period: DocumentInsightPeriod.Week,
      startUuid: FULL_UUID_RANGE[0],
      endUuid: FULL_UUID_RANGE[1],
    });

    const rows = await DocumentInsight.findAll({
      where: { documentId: document.id },
      order: [["period", "ASC"]],
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.period).sort()).toEqual([
      DocumentInsightPeriod.Day,
      DocumentInsightPeriod.Week,
    ]);
  });
});
