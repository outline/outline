// @flow
import { FileOperation } from "../models";
import { buildAdmin, buildFileOperation } from "../test/factories";
import { flushdb } from "../test/support";
import fileOperationDeleter from "./fileOperationDeleter";

jest.mock("aws-sdk", () => {
  const mS3 = { deleteObject: jest.fn().mockReturnThis(), promise: jest.fn() };
  return {
    S3: jest.fn(() => mS3),
    Endpoint: jest.fn(),
  };
});

beforeEach(() => flushdb());

describe("fileOperationDeleter", () => {
  it("should destroy file operation", async () => {
    const admin = await buildAdmin();
    const fileOp = await buildFileOperation({
      userId: admin.id,
      teamId: admin.teamId,
    });

    await fileOperationDeleter(fileOp, admin);

    expect(await FileOperation.count()).toEqual(0);
  });
});
