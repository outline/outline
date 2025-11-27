import { subDays } from "date-fns";
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
  it("should error exports older than 12 hours", async () => {
    const team = await buildTeam();
    await buildFileOperation({
      teamId: team.id,
      type: FileOperationType.Export,
      state: FileOperationState.Creating,
      createdAt: subDays(new Date(), 15),
    });
    await buildFileOperation({
      teamId: team.id,
      type: FileOperationType.Export,
      state: FileOperationState.Complete,
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
    const team = await buildTeam();
    await buildFileOperation({
      teamId: team.id,
      type: FileOperationType.Export,
      state: FileOperationState.Creating,
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
