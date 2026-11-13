import { Minute } from "@shared/utils/time";
import teamPermanentDeleter from "@server/commands/teamPermanentDeleter";
import Logger from "@server/logging/Logger";
import { Team } from "@server/models";
import { MutexLock } from "@server/utils/MutexLock";
import { BaseTask, TaskPriority } from "./base/BaseTask";

type Props = {
  /** The team ID to permanently destroy */
  teamId: string;
};

export default class CleanupDeletedTeamTask extends BaseTask<Props> {
  protected jobId({ teamId }: Props) {
    return `cleanup-team:${teamId}`;
  }

  /**
   * Permanently destroys a team. Only one team is destroyed at a time across
   * all workers. If another team is in progress the team is skipped, and the
   * next run of CleanupDeletedTeamsTask schedules it again.
   *
   * @param props The properties of the task.
   * @returns A promise that resolves once the task has completed.
   */
  public async perform({ teamId }: Props) {
    const ran = await MutexLock.tryUsing(
      "CleanupDeletedTeamTask",
      5 * Minute.ms,
      async () => {
        const team = await Team.findByPk(teamId, {
          paranoid: false,
          rejectOnEmpty: true,
        });
        await teamPermanentDeleter(team);
        return true;
      }
    );
    if (!ran) {
      Logger.info(
        "task",
        `Another team is being destroyed, skipping team ${teamId}`
      );
    }
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
