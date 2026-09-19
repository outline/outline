import { subDays } from "date-fns";
import { SearchQuery } from "@server/models";
import { buildSearchQuery, buildTeam } from "@server/test/factories";
import CleanupOldSearchQueriesTask from "./CleanupOldSearchQueriesTask";

describe("CleanupOldSearchQueriesTask", () => {
  it("deletes search queries older than the retention window", async () => {
    const team = await buildTeam();
    const old = await buildSearchQuery({
      teamId: team.id,
      createdAt: subDays(new Date(), 400),
    });
    const recent = await buildSearchQuery({
      teamId: team.id,
      createdAt: subDays(new Date(), 5),
    });

    await new CleanupOldSearchQueriesTask().perform({
      limit: 10000,
      partition: {
        partitionIndex: 0,
        partitionCount: 1,
      },
    });

    expect(await SearchQuery.findByPk(old.id)).toBeNull();
    expect(await SearchQuery.findByPk(recent.id)).not.toBeNull();
  });
});
