import { format, subDays } from "date-fns";
import { DocumentInsight } from "@server/models";
import { buildDocument, buildTeam } from "@server/test/factories";
import CleanupExpiredDocumentInsightsTask from "./CleanupExpiredDocumentInsightsTask";

const daysAgo = (n: number) => subDays(new Date(), n);
const dayStr = (d: Date) => format(d, "yyyy-MM-dd");

describe("CleanupExpiredDocumentInsightsTask", () => {
  it("deletes rows older than the retention window", async () => {
    const team = await buildTeam();
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: dayStr(daysAgo(400)),
      viewCount: 1,
    });
    await DocumentInsight.create({
      documentId: document.id,
      teamId: team.id,
      date: dayStr(daysAgo(5)),
      viewCount: 1,
    });

    await new CleanupExpiredDocumentInsightsTask().perform();

    const dates = (
      await DocumentInsight.findAll({
        where: { documentId: document.id },
        order: [["date", "ASC"]],
      })
    ).map((i) => i.date);

    expect(dates).not.toContain(dayStr(daysAgo(400)));
    expect(dates).toContain(dayStr(daysAgo(5)));
  });
});
