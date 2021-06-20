// @flow
import fs from "fs";
import path from "path";
import markdownDiff from "./markdownDiff";

it("should diff a complex document", async () => {
  const before = await fs.promises.readFile(
    path.resolve(__dirname, "..", "test", "fixtures", "complex.md"),
    "utf8"
  );

  const after = await fs.promises.readFile(
    path.resolve(__dirname, "..", "test", "fixtures", "complexModified.md"),
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
    path.resolve(__dirname, "..", "test", "fixtures", "complex.md"),
    "utf8"
  );

  const diff = markdownDiff("", content);
  expect(diff).toMatchSnapshot();
});

it("should mark changed nodes", async () => {
  const diff = markdownDiff("# Heading", "## Heading");
  expect(diff).toMatchSnapshot();
});
