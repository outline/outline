import { subDays } from "date-fns";
import { FileOperation } from "@server/models";
import {
  FileOperationState,
  FileOperationType,
} from "@server/models/FileOperation";
import { buildFileOperation } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import CleanupExpiredFileOperationsTask from "./CleanupExpiredFileOperationsTask";

beforeEach(() => flushdb());

describe("CleanupExpiredFileOperationsTask", () => {
  it("should expire exports older than 30 days ago", async () => {
    await buildFileOperation({
      type: FileOperationType.Export,
      state: FileOperationState.Complete,
      createdAt: subDays(new Date(), 30),
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

  it("should not expire exports made less than 30 days ago", async () => {
    await buildFileOperation({
      type: FileOperationType.Export,
      state: FileOperationState.Complete,
      createdAt: subDays(new Date(), 29),
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
