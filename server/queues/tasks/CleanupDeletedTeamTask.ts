import teamPermanentDeleter from "@server/commands/teamPermanentDeleter";
import { Team } from "@server/models";
import BaseTask, { TaskPriority } from "./BaseTask";

type Props = {
  /** The team ID to permanantly destroy */
  teamId: string;
};

export default class CleanupDeletedTeamTask extends BaseTask<Props> {
  public async perform({ teamId }: Props) {
    const team = await Team.findByPk(teamId, {
      paranoid: false,
      rejectOnEmpty: true,
    });
    await teamPermanentDeleter(team);
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
