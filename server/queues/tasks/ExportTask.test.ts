import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { vi } from "vitest";
import { FileOperationState, NotificationEventType } from "@shared/types";
import { Notification } from "@server/models";
import presentNotification from "@server/presenters/notification";
import FileStorage from "@server/storage/files";
import {
  buildAdmin,
  buildCollection,
  buildFileOperation,
  buildUser,
} from "@server/test/factories";
import ExportMarkdownZipTask from "./ExportMarkdownZipTask";
import RevokeUserNotificationsTask from "./RevokeUserNotificationsTask";

describe("ExportTask", () => {
  beforeEach(() => {
    vi.spyOn(FileStorage, "store").mockResolvedValue("https://example.com");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const exportToTempFile = () =>
    vi
      .spyOn(ExportMarkdownZipTask.prototype, "loadDataAndExport")
      .mockImplementation(async () => {
        const filePath = path.join(os.tmpdir(), `export-${Date.now()}.zip`);
        await fs.writeFile(filePath, "data");
        return filePath;
      });

  it("should notify the user in the app when the export completes", async () => {
    const user = await buildAdmin();
    const fileOperation = await buildFileOperation({
      teamId: user.teamId,
      userId: user.id,
    });
    exportToTempFile();

    await new ExportMarkdownZipTask().perform({
      fileOperationId: fileOperation.id,
    });

    const notifications = await Notification.findAll({
      where: { userId: user.id },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].event).toEqual(
      NotificationEventType.ExportCompleted
    );
    expect(notifications[0].fileOperationId).toEqual(fileOperation.id);

    const presented = await presentNotification(undefined, notifications[0]);
    expect(presented.fileOperation?.id).toEqual(fileOperation.id);
    expect(presented.fileOperation?.state).toEqual(FileOperationState.Complete);
  });

  it("should notify the user in the app when the export fails", async () => {
    const user = await buildAdmin();
    const fileOperation = await buildFileOperation({
      teamId: user.teamId,
      userId: user.id,
    });
    vi.spyOn(
      ExportMarkdownZipTask.prototype,
      "loadDataAndExport"
    ).mockRejectedValue(new Error("Export failed"));

    await expect(
      new ExportMarkdownZipTask().perform({
        fileOperationId: fileOperation.id,
      })
    ).rejects.toThrow("Export failed");

    const notification = await Notification.findOne({
      where: { userId: user.id },
      rejectOnEmpty: true,
    });
    expect(notification.fileOperationId).toEqual(fileOperation.id);
    expect(notification.fileOperation?.state).toEqual(FileOperationState.Error);
  });

  it("should revoke the notification when the user can no longer read the source", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });
    const fileOperation = await buildFileOperation({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });
    exportToTempFile();

    await new ExportMarkdownZipTask().perform({
      fileOperationId: fileOperation.id,
    });
    const notification = await Notification.findOne({
      where: { userId: user.id },
      rejectOnEmpty: true,
    });
    expect(notification.collectionId).toEqual(collection.id);

    await new RevokeUserNotificationsTask().perform({
      userId: user.id,
      collectionId: collection.id,
    });

    expect(await Notification.findByPk(notification.id)).toBeNull();
  });

  it("should not notify a user that is not subscribed", async () => {
    const user = await buildAdmin();
    user.setNotificationEventType(NotificationEventType.ExportCompleted, false);
    await user.save();
    const fileOperation = await buildFileOperation({
      teamId: user.teamId,
      userId: user.id,
    });
    exportToTempFile();

    await new ExportMarkdownZipTask().perform({
      fileOperationId: fileOperation.id,
    });

    const count = await Notification.count({ where: { userId: user.id } });
    expect(count).toEqual(0);
  });
});
