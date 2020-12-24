// @flow
import path from "path";
import File from "formidable/lib/file";
import { buildUser } from "../test/factories";
import { flushdb } from "../test/support";
import documentBatchImporter from "./documentBatchImporter";

jest.mock("../utils/s3");

beforeEach(() => flushdb());

describe("documentBatchImporter", () => {
  const ip = "127.0.0.1";

  it("should import documents in outline format", async () => {
    const user = await buildUser();
    const name = "outline.zip";
    const file = new File({
      name,
      type: "application/zip",
      path: path.resolve(__dirname, "..", "test", "fixtures", name),
    });

    const response = await documentBatchImporter({
      type: "outline",
      user,
      file,
      ip,
    });

    expect(Object.keys(response.collections).length).toEqual(1);
    expect(Object.keys(response.documents).length).toEqual(15);
    expect(Object.keys(response.attachments).length).toEqual(6);
  });
});
