import { Readable } from "node:stream";
import { ZipFile } from "yazl";
import { AttachmentPreset } from "@shared/types";
import env from "@server/env";
import FileStorage from "@server/storage/files";
import { buildAttachment } from "@server/test/factories";
import ZipHelper from "@server/utils/ZipHelper";
import AttachmentHelper from "./AttachmentHelper";

describe("AttachmentHelper", () => {
  describe("presetToAcl", () => {
    it("uses a private attachment ACL when S3 object ACLs are disabled", () => {
      const original = env.AWS_S3_ACL;
      env.AWS_S3_ACL = "";

      try {
        expect(
          AttachmentHelper.presetToAcl(AttachmentPreset.DocumentAttachment)
        ).toBe("private");
        expect(AttachmentHelper.presetToAcl(AttachmentPreset.Avatar)).toBe(
          "public-read"
        );
      } finally {
        env.AWS_S3_ACL = original;
      }
    });

    it("uses a configured attachment ACL", () => {
      const original = env.AWS_S3_ACL;
      env.AWS_S3_ACL = "public-read";

      try {
        expect(
          AttachmentHelper.presetToAcl(AttachmentPreset.DocumentAttachment)
        ).toBe("public-read");
      } finally {
        env.AWS_S3_ACL = original;
      }
    });
  });

  describe("getKey", () => {
    it("should return the correct key for a private attachment", () => {
      const key = AttachmentHelper.getKey({
        id: "123",
        name: "test.png",
        userId: "456",
      });

      expect(key).toEqual("uploads/456/123/test.png");
    });

    it("should return the correct key for a long file name", () => {
      const key = AttachmentHelper.getKey({
        id: "123",
        name: "a".repeat(300),
        userId: "456",
      });

      expect(key).toEqual(
        `uploads/456/123/${"a".repeat(AttachmentHelper.maximumFileNameLength)}`
      );
    });

    it("should remove invalid characters from the key", () => {
      const key = AttachmentHelper.getKey({
        id: "123",
        name: "test/../one.png",
        userId: "456",
      });

      expect(key).toEqual("uploads/456/123/test/one.png");
    });
  });

  describe("addToArchive", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should stream the attachment into the archive", async () => {
      const attachment = await buildAttachment();
      vi.spyOn(FileStorage, "getFileStream").mockImplementation(async () =>
        Readable.from([Buffer.from("image-data")])
      );
      vi.spyOn(FileStorage, "getFileBuffer");

      const zip = new ZipFile();
      const chunks: Buffer[] = [];
      zip.outputStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      const finished = new Promise((resolve) =>
        zip.outputStream.on("end", resolve)
      );

      AttachmentHelper.addToArchive(zip, attachment, "image.png");
      zip.end();
      await finished;

      const entries: Record<string, string> = {};
      await ZipHelper.walk(Buffer.concat(chunks), async (entry) => {
        entries[entry.fileName] = (await entry.readBuffer(1024)).toString();
      });

      expect(entries).toEqual({ "image.png": "image-data" });
      expect(FileStorage.getFileBuffer).not.toHaveBeenCalled();
    });

    it("should destroy the storage stream when the signal aborts", async () => {
      const attachment = await buildAttachment();
      const stream = new Readable({ read() {} });
      const getFileStream = vi
        .spyOn(FileStorage, "getFileStream")
        .mockResolvedValue(stream);

      const zip = new ZipFile();
      zip.outputStream.resume();
      const controller = new AbortController();

      AttachmentHelper.addToArchive(
        zip,
        attachment,
        "image.png",
        controller.signal
      );
      zip.end();
      await vi.waitFor(() => expect(getFileStream).toHaveBeenCalled());
      await new Promise((resolve) => setImmediate(resolve));

      controller.abort();
      expect(stream.destroyed).toBe(true);
    });

    it("should destroy the storage stream when the signal aborts while it opens", async () => {
      const attachment = await buildAttachment();
      const stream = new Readable({ read() {} });
      const controller = new AbortController();
      vi.spyOn(FileStorage, "getFileStream").mockImplementation(async () => {
        controller.abort();
        return stream;
      });

      const zip = new ZipFile();
      const finished = new Promise((resolve) =>
        zip.outputStream.on("end", resolve)
      );
      zip.outputStream.resume();

      AttachmentHelper.addToArchive(
        zip,
        attachment,
        "image.png",
        controller.signal
      );
      zip.end();
      await finished;

      expect(stream.destroyed).toBe(true);
    });

    it("should not read from storage when the signal has already aborted", async () => {
      const attachment = await buildAttachment();
      const getFileStream = vi.spyOn(FileStorage, "getFileStream");

      const zip = new ZipFile();
      const finished = new Promise((resolve) =>
        zip.outputStream.on("end", resolve)
      );
      zip.outputStream.resume();
      const controller = new AbortController();
      controller.abort();

      AttachmentHelper.addToArchive(
        zip,
        attachment,
        "image.png",
        controller.signal
      );
      zip.end();
      await finished;

      expect(getFileStream).not.toHaveBeenCalled();
    });
  });
});
