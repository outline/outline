import { FileOperation } from "@server/models";
import { buildAdmin, buildFileOperation } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import fileOperationDeleter from "./fileOperationDeleter";

jest.mock("aws-sdk", () => {
  const mS3 = {
    createPresignedPost: jest.fn(),
    deleteObject: jest.fn().mockReturnThis(),
    promise: jest.fn(),
  };
  return {
    S3: jest.fn(() => mS3),
    Endpoint: jest.fn(),
  };
});
beforeEach(() => flushdb());

describe("fileOperationDeleter", () => {
  const ip = "127.0.0.1";

  it("should destroy file operation", async () => {
    const admin = await buildAdmin();
    const fileOp = await buildFileOperation({
      userId: admin.id,
      teamId: admin.teamId,
    });
    await fileOperationDeleter(fileOp, admin, ip);
    expect(await FileOperation.count()).toEqual(0);
  });
});
