import { FileOperation } from "@server/models";
import { buildAdmin, buildFileOperation } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import fileOperationDeleter from "./fileOperationDeleter";

setupTestDatabase();

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
