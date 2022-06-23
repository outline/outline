import fs from "fs";
import path from "path";
import markdownDiff from "./markdownDiff";

it("should diff a complex document", async () => {
  const before = await fs.promises.readFile(
    path.resolve(process.cwd(), "server", "test", "fixtures", "complex.md"),
    "utf8"
  );

  const after = await fs.promises.readFile(
    path.resolve(
      process.cwd(),
      "server",
      "test",
      "fixtures",
      "complexModified.md"
    ),
    "utf8"
  );

  const diff = markdownDiff(before, after);
  expect(diff).toMatchSnapshot();
});

it("should return empty string when both sides are empty", () => {
  const diff = markdownDiff("", "");
  expect(diff).toEqual("");
});

it("should return everything inserted when previously empty", async () => {
  const content = await fs.promises.readFile(
    path.resolve(process.cwd(), "server", "test", "fixtures", "complex.md"),
    "utf8"
  );

  const diff = markdownDiff("", content);
  expect(diff).toMatchSnapshot();
});

it("should return empty for changed nodes", async () => {
  // Note: This isn't ideal behavior, but it is current behavior. If the diffing
  // library is improved then we could potentially render the old + new heading
  // with ins/del tags as appropriate.
  const diff = markdownDiff("# Heading", "## Heading");
  expect(diff).toEqual("");
});

it("should return deleted nodes", async () => {
  const diff = markdownDiff("![caption](/image.png)", "");
  expect(diff).toEqual(
    '<p><del data-operation-index="0"><img src="/image.png" alt="caption"></del></p>'
  );
});
