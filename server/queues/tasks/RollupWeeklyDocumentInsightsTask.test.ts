import { format, startOfISOWeek, subDays } from "date-fns";
import { DocumentInsight, Event } from "@server/models";
import { DocumentInsightPeriod } from "@server/models/DocumentInsight";
import { buildDocument, buildTeam, buildUser } from "@server/test/factories";
import RollupWeeklyDocumentInsightsTask from "./RollupWeeklyDocumentInsightsTask";

const props = {
  limit: 10000,
  partition: {
    partitionIndex: 0,
    partitionCount: 1,
  },
};

const daysAgo = (n: number) => subDays(new Date(), n);
const dayStr = (d: Date) => format(d, "yyyy-MM-dd");

vi.setConfig({ testTimeout: 30000 });

describe("RollupWeeklyDocumentInsightsTask", () => {
  let task: RollupWeeklyDocumentInsightsTask;

  beforeEach(() => {
    task = new RollupWeeklyDocumentInsightsTask();
  });

  it("leaves recent daily rows untouched", async () => {
    const team = await buildTeam();
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: dayStr(daysAgo(5)),
      period: DocumentInsightPeriod.Day,
      viewCount: 3,
    });

    await task.perform(props);

    const rows = await DocumentInsight.findAll({
      where: { documentId: document.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].period).toBe(DocumentInsightPeriod.Day);
  });

  it("collapses daily rows older than the cutoff into a weekly row", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    // Pick a date comfortably past the 30-day cutoff + week buffer.
    const aDayInOldWeek = daysAgo(60);
    const weekStart = startOfISOWeek(aDayInOldWeek);

    // A historical daily row within the old week.
    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: dayStr(aDayInOldWeek),
      period: DocumentInsightPeriod.Day,
      viewCount: 99,
    });

    // Source event in the same week so rollup can recompute accurately.
    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
      createdAt: aDayInOldWeek,
    });

    await task.perform(props);

    const rows = await DocumentInsight.findAll({
      where: { documentId: document.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].period).toBe(DocumentInsightPeriod.Week);
    expect(rows[0].date).toBe(dayStr(weekStart));
    expect(rows[0].viewCount).toBe(1);
    expect(rows[0].viewerCount).toBe(1);
  });

  it("preserves daily rows for soft-deleted documents", async () => {
    const team = await buildTeam();
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: new Date(),
    });

    const aDayInOldWeek = daysAgo(60);

    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: dayStr(aDayInOldWeek),
      period: DocumentInsightPeriod.Day,
      viewCount: 7,
    });

    await task.perform(props);

    const rows = await DocumentInsight.findAll({
      where: { documentId: document.id },
    });
    // The daily row stays put — rollupPeriod skips deleted documents, so we
    // must not delete data we wouldn't replace.
    expect(rows).toHaveLength(1);
    expect(rows[0].period).toBe(DocumentInsightPeriod.Day);
    expect(rows[0].viewCount).toBe(7);
  });

  it("is idempotent when re-run", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    const aDayInOldWeek = daysAgo(60);

    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: dayStr(aDayInOldWeek),
      period: DocumentInsightPeriod.Day,
      viewCount: 1,
    });
    await Event.create({
      name: "views.create",
      teamId: team.id,
      userId: user.id,
      documentId: document.id,
      createdAt: aDayInOldWeek,
    });

    await task.perform(props);
    await task.perform(props);

    const rows = await DocumentInsight.findAll({
      where: { documentId: document.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].period).toBe(DocumentInsightPeriod.Week);
  });
});
