import { subDays } from "date-fns";
import { Team } from "@server/models";
import { buildTeam } from "@server/test/factories";
import { MutexLock } from "@server/utils/MutexLock";
import CleanupDeletedTeamTask from "./CleanupDeletedTeamTask";

describe("CleanupDeletedTeamTask", () => {
  beforeEach(() => {
    vi.mocked(MutexLock.tryUsing).mockClear();
  });

  it("should destroy the team when no other team is in progress", async () => {
    const team = await buildTeam({
      deletedAt: subDays(new Date(), 31),
    });

    await new CleanupDeletedTeamTask().perform({ teamId: team.id });

    expect(
      await Team.count({ where: { id: team.id }, paranoid: false })
    ).toEqual(0);
  });

  it("should skip the team when another team is in progress", async () => {
    const team = await buildTeam({
      deletedAt: subDays(new Date(), 31),
    });
    vi.mocked(MutexLock.tryUsing).mockResolvedValueOnce(undefined);

    await new CleanupDeletedTeamTask().perform({ teamId: team.id });

    expect(
      await Team.count({ where: { id: team.id }, paranoid: false })
    ).toEqual(1);
  });

  it("should use the same lock for every team", async () => {
    const first = await buildTeam({
      deletedAt: subDays(new Date(), 31),
    });
    const second = await buildTeam({
      deletedAt: subDays(new Date(), 31),
    });
    const task = new CleanupDeletedTeamTask();

    await task.perform({ teamId: first.id });
    await task.perform({ teamId: second.id });

    const calls = vi
      .mocked(MutexLock.tryUsing)
      .mock.calls.filter(([resource]) => resource === "CleanupDeletedTeamTask");
    expect(calls).toHaveLength(2);
  });
});
