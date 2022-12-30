import { subDays } from "date-fns";
import { FileOperationState, FileOperationType } from "@shared/types";
import { FileOperation } from "@server/models";
import { buildFileOperation } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import CleanupExpiredFileOperationsTask from "./CleanupExpiredFileOperationsTask";

setupTestDatabase();

describe("CleanupExpiredFileOperationsTask", () => {
  it("should expire exports older than 15 days ago", async () => {
    await buildFileOperation({
      type: FileOperationType.Export,
      state: FileOperationState.Complete,
      createdAt: subDays(new Date(), 15),
    });
    await buildFileOperation({
      type: FileOperationType.Export,
      state: FileOperationState.Complete,
    });

    /* This is a test helper that creates a new task and runs it. */
    const task = new CleanupExpiredFileOperationsTask();
    await task.perform({ limit: 100 });

    const data = await FileOperation.count({
      where: {
        type: FileOperationType.Export,
        state: FileOperationState.Expired,
      },
    });
    expect(data).toEqual(1);
  });

  it("should not expire exports made less than 15 days ago", async () => {
    await buildFileOperation({
      type: FileOperationType.Export,
      state: FileOperationState.Complete,
      createdAt: subDays(new Date(), 14),
    });
    await buildFileOperation({
      type: FileOperationType.Export,
      state: FileOperationState.Complete,
    });

    const task = new CleanupExpiredFileOperationsTask();
    await task.perform({ limit: 100 });

    const data = await FileOperation.count({
      where: {
        type: FileOperationType.Export,
        state: FileOperationState.Expired,
      },
    });
    expect(data).toEqual(0);
  });
});
