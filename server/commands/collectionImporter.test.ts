import path from "path";
import File from "formidable/lib/file";
import { Attachment, Document, Collection } from "@server/models";
import { buildUser } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import collectionImporter from "./collectionImporter";

jest.mock("../utils/s3");
beforeEach(() => flushdb());

describe("collectionImporter", () => {
  const ip = "127.0.0.1";

  it("should import documents in outline format", async () => {
    const user = await buildUser();
    const name = "outline.zip";
    const file = new File({
      name,
      type: "application/zip",
      path: path.resolve(__dirname, "..", "test", "fixtures", name),
    });
    const response = await collectionImporter({
      type: "outline",
      user,
      file,
      ip,
    });
    expect(response.collections.length).toEqual(1);
    expect(response.documents.length).toEqual(8);
    expect(response.attachments.length).toEqual(6);
    expect(await Collection.count()).toEqual(1);
    expect(await Document.count()).toEqual(8);
    expect(await Attachment.count()).toEqual(6);
  });

  it("should throw an error with corrupt zip", async () => {
    const user = await buildUser();
    const name = "corrupt.zip";
    const file = new File({
      name,
      type: "application/zip",
      path: path.resolve(__dirname, "..", "test", "fixtures", name),
    });
    let error;

    try {
      await collectionImporter({
        type: "outline",
        user,
        file,
        ip,
      });
    } catch (err) {
      error = err;
    }

    expect(error && error.message).toBeTruthy();
  });

  it("should throw an error with empty zip", async () => {
    const user = await buildUser();
    const name = "empty.zip";
    const file = new File({
      name,
      type: "application/zip",
      path: path.resolve(__dirname, "..", "test", "fixtures", name),
    });
    let error;

    try {
      await collectionImporter({
        type: "outline",
        user,
        file,
        ip,
      });
    } catch (err) {
      error = err;
    }

    expect(error && error.message).toBe(
      "Uploaded file does not contain importable documents"
    );
  });
});
