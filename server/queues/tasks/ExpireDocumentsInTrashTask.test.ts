import { buildTeam } from "@server/test/factories";
import { TeamPreferenceDefaults } from "@shared/constants";
import { TeamPreference } from "@shared/types";
import ExpireDocumentsInTrashTask from "./ExpireDocumentsInTrashTask";
import ExpireDocumentsInTrashByRetentionTask from "./ExpireDocumentsInTrashByRetentionTask";

const props = {
  limit: 100,
  partition: {
    partitionIndex: 0,
    partitionCount: 1,
  },
};

const defaultRetentionDays = TeamPreferenceDefaults[
  TeamPreference.TrashRetentionDays
] as number;

describe("ExpireDocumentsInTrashTask", () => {
  it("should schedule worker tasks for default and custom retention periods", async () => {
    const scheduleSpy = vi.spyOn(
      ExpireDocumentsInTrashByRetentionTask.prototype,
      "schedule"
    );

    // Team with custom retention
    const teamCustom = await buildTeam();
    const customDays = 7;
    teamCustom.setPreference(TeamPreference.TrashRetentionDays, customDays);
    await teamCustom.save();

    const task = new ExpireDocumentsInTrashTask();
    await task.perform(props);

    // Verify that the default retention task was scheduled
    expect(scheduleSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        retentionDays: defaultRetentionDays,
        partition: props.partition,
      })
    );

    // Verify that the custom retention task was scheduled.
    expect(scheduleSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: props.limit,
        retentionDays: customDays,
        partition: props.partition,
      })
    );

    scheduleSpy.mockRestore();
  });

  it("should always schedule a worker for the default retention period", async () => {
    const scheduleSpy = vi.spyOn(
      ExpireDocumentsInTrashByRetentionTask.prototype,
      "schedule"
    );

    const task = new ExpireDocumentsInTrashTask();
    await task.perform(props);

    expect(scheduleSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        retentionDays: defaultRetentionDays,
        partition: props.partition,
      })
    );

    scheduleSpy.mockRestore();
  });

  it("should not schedule a worker for infinite retention", async () => {
    const scheduleSpy = vi.spyOn(
      ExpireDocumentsInTrashByRetentionTask.prototype,
      "schedule"
    );

    const team = await buildTeam();
    team.setPreference(TeamPreference.TrashRetentionDays, 0);
    await team.save();

    const task = new ExpireDocumentsInTrashTask();
    await task.perform(props);

    const scheduled = scheduleSpy.mock.calls.map(
      ([{ retentionDays }]) => retentionDays
    );
    expect(scheduled).not.toContain(0);

    scheduleSpy.mockRestore();
  });
});
