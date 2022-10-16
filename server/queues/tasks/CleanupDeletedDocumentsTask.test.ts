import { subDays } from "date-fns";
import { Document } from "@server/models";
import { buildDocument } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import CleanupDeletedDocumentsTask from "./CleanupDeletedDocumentsTask";

setupTestDatabase();

describe("CleanupDeletedDocumentsTask", () => {
  it("should not destroy documents not deleted", async () => {
    await buildDocument({
      publishedAt: new Date(),
    });

    const task = new CleanupDeletedDocumentsTask();
    await task.perform({ limit: 100 });

    expect(
      await Document.unscoped().count({
        paranoid: false,
      })
    ).toEqual(1);
  });

  it("should not destroy documents deleted less than 30 days ago", async () => {
    await buildDocument({
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), 25),
    });

    const task = new CleanupDeletedDocumentsTask();
    await task.perform({ limit: 100 });

    expect(
      await Document.unscoped().count({
        paranoid: false,
      })
    ).toEqual(1);
  });

  it("should destroy documents deleted more than 30 days ago", async () => {
    await buildDocument({
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), 60),
    });

    const task = new CleanupDeletedDocumentsTask();
    await task.perform({ limit: 100 });

    expect(
      await Document.unscoped().count({
        paranoid: false,
      })
    ).toEqual(0);
  });

  it("should destroy draft documents deleted more than 30 days ago", async () => {
    await buildDocument({
      publishedAt: undefined,
      deletedAt: subDays(new Date(), 60),
    });

    const task = new CleanupDeletedDocumentsTask();
    await task.perform({ limit: 100 });

    expect(
      await Document.unscoped().count({
        paranoid: false,
      })
    ).toEqual(0);
  });
});
