import { subDays } from "date-fns";
import { FileOperationState, FileOperationType } from "@shared/types";
import { FileOperation } from "@server/models";
import { buildFileOperation } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import ErrorTimedOutFileOperationsTask from "./ErrorTimedOutFileOperationsTask";

setupTestDatabase();

describe("ErrorTimedOutFileOperationsTask", () => {
  it("should error exports older than 12 hours", async () => {
    await buildFileOperation({
      type: FileOperationType.Export,
      state: FileOperationState.Creating,
      createdAt: subDays(new Date(), 15),
    });
    await buildFileOperation({
      type: FileOperationType.Export,
      state: FileOperationState.Complete,
    });

    /* This is a test helper that creates a new task and runs it. */
    const task = new ErrorTimedOutFileOperationsTask();
    await task.perform({ limit: 100 });

    const data = await FileOperation.count({
      where: {
        type: FileOperationType.Export,
        state: FileOperationState.Error,
      },
    });
    expect(data).toEqual(1);
  });

  it("should not error exports created less than 12 hours ago", async () => {
    await buildFileOperation({
      type: FileOperationType.Export,
      state: FileOperationState.Creating,
    });

    const task = new ErrorTimedOutFileOperationsTask();
    await task.perform({ limit: 100 });

    const data = await FileOperation.count({
      where: {
        type: FileOperationType.Export,
        state: FileOperationState.Error,
      },
    });
    expect(data).toEqual(0);
  });
});
