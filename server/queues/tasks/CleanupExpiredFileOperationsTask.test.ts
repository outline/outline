import { subDays } from "date-fns";
import { FileOperationState, FileOperationType } from "@shared/types";
import { FileOperation } from "@server/models";
import { buildFileOperation, buildTeam } from "@server/test/factories";
import CleanupExpiredFileOperationsTask from "./CleanupExpiredFileOperationsTask";

const props = {
  limit: 100,
  partition: {
    partitionIndex: 0,
    partitionCount: 1,
  },
};

describe("CleanupExpiredFileOperationsTask", () => {
  it("should expire exports older than 15 days ago", async () => {
    const team = await buildTeam();
    await buildFileOperation({
      teamId: team.id,
      type: FileOperationType.Export,
      state: FileOperationState.Complete,
      createdAt: subDays(new Date(), 15),
    });
    await buildFileOperation({
      teamId: team.id,
      type: FileOperationType.Export,
      state: FileOperationState.Complete,
    });

    const task = new CleanupExpiredFileOperationsTask();
    await task.perform(props);

    const data = await FileOperation.count({
      where: {
        teamId: team.id,
        type: FileOperationType.Export,
        state: FileOperationState.Expired,
      },
    });
    expect(data).toEqual(1);
  });

  it("should not expire exports made less than 15 days ago", async () => {
    const team = await buildTeam();
    await buildFileOperation({
      teamId: team.id,
      type: FileOperationType.Export,
      state: FileOperationState.Complete,
      createdAt: subDays(new Date(), 14),
    });
    await buildFileOperation({
      teamId: team.id,
      type: FileOperationType.Export,
      state: FileOperationState.Complete,
    });

    const task = new CleanupExpiredFileOperationsTask();
    await task.perform(props);

    const data = await FileOperation.count({
      where: {
        teamId: team.id,
        type: FileOperationType.Export,
        state: FileOperationState.Expired,
      },
    });
    expect(data).toEqual(0);
  });
});
