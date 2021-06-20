// @flow
import fs from "fs";
import path from "path";
import revisionDiff from "./revisionDiff";

it("should diff a new revision of a document", async () => {
  let fileValue1 = await fs.promises.readFile(
    path.resolve(__dirname, "..", "test", "fixtures", "complex.md"),
    "utf8"
  );

  let fileValue2 = await fs.promises.readFile(
    path.resolve(__dirname, "..", "test", "fixtures", "complexModified.md"),
    "utf8"
  );

  // expose API in lib, use direct path for now
  // !! == checklist item all need classes to distinguish

  const diff = revisionDiff(fileValue1, fileValue2);
  expect(diff).toMatchSnapshot();

  // TODO hand evaluate the veracity fo the snapshot
});

it("should return empty string when the new revision has the same content", () => {});
