import { subHours } from "date-fns";
import { FileOperationState, FileOperationType } from "@shared/types";
import { FileOperation } from "@server/models";
import { buildFileOperation, buildTeam } from "@server/test/factories";
import ErrorTimedOutFileOperationsTask from "./ErrorTimedOutFileOperationsTask";

const props = {
  limit: 100,
  partition: {
    partitionIndex: 0,
    partitionCount: 1,
  },
};

describe("ErrorTimedOutFileOperationsTask", () => {
  let team: Awaited<ReturnType<typeof buildTeam>>;

  beforeEach(async () => {
    team = await buildTeam();
    // Clean up any existing file operations for this team
    await FileOperation.destroy({
      where: { teamId: team.id },
      force: true,
    });
  });

  it("should error exports older than 12 hours", async () => {
    await buildFileOperation({
      teamId: team.id,
      type: FileOperationType.Export,
      state: FileOperationState.Creating,
      createdAt: subHours(new Date(), 13),
    });
    await buildFileOperation({
      teamId: team.id,
      type: FileOperationType.Export,
      state: FileOperationState.Complete,
      createdAt: subHours(new Date(), 13),
    });

    const task = new ErrorTimedOutFileOperationsTask();
    await task.perform(props);

    const data = await FileOperation.count({
      where: {
        teamId: team.id,
        type: FileOperationType.Export,
        state: FileOperationState.Error,
      },
    });
    expect(data).toEqual(1);
  });

  it("should not error exports created less than 12 hours ago", async () => {
    await buildFileOperation({
      teamId: team.id,
      type: FileOperationType.Export,
      state: FileOperationState.Creating,
      createdAt: subHours(new Date(), 11),
    });

    const task = new ErrorTimedOutFileOperationsTask();
    await task.perform(props);

    const data = await FileOperation.count({
      where: {
        teamId: team.id,
        type: FileOperationType.Export,
        state: FileOperationState.Error,
      },
    });
    expect(data).toEqual(0);
  });
});
