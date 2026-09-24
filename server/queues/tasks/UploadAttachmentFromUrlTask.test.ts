// @vitest-isolate true
import { Attachment } from "@server/models";
import FileStorage from "@server/storage/files";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UploadAttachmentFromUrlTask from "./UploadAttachmentFromUrlTask";

const attachmentId = "00000000-0000-0000-0000-000000000001";
const props = {
  attachmentId,
  url: "https://example.com/file.png",
};

const attachment = {
  id: attachmentId,
  key: "uploads/file.png",
  acl: "private",
  user: {},
  updateWithCtx: vi.fn(),
  destroy: vi.fn(),
};

describe("UploadAttachmentFromUrlTask", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(Attachment, "findByPk").mockResolvedValue(attachment as never);
    vi.spyOn(FileStorage, "storeFromUrl").mockRejectedValue(
      new Error("upload failed")
    );
  });

  it("fails when storage returns no upload result", async () => {
    vi.mocked(FileStorage.storeFromUrl).mockResolvedValue(undefined);
    const task = new UploadAttachmentFromUrlTask();

    await expect(task.perform(props)).rejects.toThrow(
      "Failed to upload attachment from URL"
    );
  });

  it("propagates storage errors so the queue can retry", async () => {
    const task = new UploadAttachmentFromUrlTask();

    await expect(task.perform(props)).rejects.toThrow("upload failed");
  });

  it("does nothing when the attachment was already removed", async () => {
    vi.mocked(Attachment.findByPk).mockResolvedValue(null);
    const task = new UploadAttachmentFromUrlTask();

    await expect(task.onFailed(props)).resolves.toBeUndefined();
  });

  it("removes the attachment after the final attempt", async () => {
    const task = new UploadAttachmentFromUrlTask();

    await task.onFailed(props);

    expect(Attachment.findByPk).toHaveBeenCalledWith(attachmentId);
    expect(attachment.destroy).toHaveBeenCalledOnce();
  });
});
