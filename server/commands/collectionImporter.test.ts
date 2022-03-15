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

  it("should generate valid links in documents when the import zip has relatively linked documents", async () => {
    const user = await buildUser();
    const name = "Import-Export.zip";
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
    expect(response.attachments.length).toEqual(2);
    expect(await Collection.count()).toEqual(1);
    expect(await Document.count()).toEqual(8);
    expect(await Attachment.count()).toEqual(2);
    const brainStorm = response.documents.find(
      (doc) => doc.title === "Brainstorm"
    );
    const meetingNotes = response.documents.find(
      (doc) => doc.title === "Meeting Notes"
    );
    const tables = response.documents.find((doc) => doc.title === "Tables");
    const github = response.documents.find((doc) => doc.title === "GitHub");
    const myfirstDoc = response.documents.find(
      (doc) => doc.title === "My first document"
    );
    const codeTesting = response.documents.find(
      (doc) => doc.title === "Code Testing"
    );
    const testDoc = response.documents.find((doc) => doc.title === "Test Doc");

    expect(brainStorm).toBeDefined();
    expect(meetingNotes).toBeDefined();
    expect(tables).toBeDefined();
    expect(github).toBeDefined();
    expect(myfirstDoc).toBeDefined();
    expect(codeTesting).toBeDefined();
    expect(testDoc).toBeDefined();

    expect(brainStorm?.text).toContain(
      `- [ ] Add notes in [Meeting Notes](/doc/meeting-notes-${meetingNotes?.urlId}) of the last week all hands.`
    );
    expect(brainStorm?.text).toContain(
      `- [ ] See If we can update the table in [Tables](/doc/tables-${tables?.urlId})`
    );
    expect(github?.text).toContain(
      `We should do some [Code Testing](/doc/code-testing-${codeTesting?.urlId}) of the attached GitHub gist.`
    );
    expect(myfirstDoc?.text).toContain(
      `This is a test link to [Test Doc](/doc/test-doc-${testDoc?.urlId})`
    );
    // My first doc has reference to itself, we don't do anything to it.
    expect(myfirstDoc?.text).toContain(
      "This is a test link to myself [My first document](/doc/my-first-document-NTU3G1Vbin)"
    );
  });
});
