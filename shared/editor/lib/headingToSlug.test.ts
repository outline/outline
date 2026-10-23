import { Schema } from "prosemirror-model";
import headingToSlug, { HeadingSlugger } from "./headingToSlug";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    heading: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
});

const heading = (text: string) =>
  schema.node("heading", null, [schema.text(text)]);

const slugs = (...titles: string[]) => {
  const slugger = new HeadingSlugger();
  return titles.map((title) => slugger.slug(heading(title)));
};

describe("headingToSlug", () => {
  it("returns a prefixed slug", () => {
    expect(headingToSlug(heading("Getting Started"))).toBe("h-getting-started");
  });

  it("appends the index when it is not zero", () => {
    expect(headingToSlug(heading("Notes"), 2)).toBe("h-notes-2");
  });
});

describe("HeadingSlugger", () => {
  it("returns the plain slug for unique headings", () => {
    expect(slugs("One", "Two")).toEqual(["h-one", "h-two"]);
  });

  it("appends a suffix to repeated headings", () => {
    expect(slugs("Notes", "Notes", "Notes")).toEqual([
      "h-notes",
      "h-notes-1",
      "h-notes-2",
    ]);
  });

  it("does not reuse a slug when a heading ends in a number", () => {
    expect(slugs("Setup", "Setup", "Setup 1")).toEqual([
      "h-setup",
      "h-setup-1",
      "h-setup-1-1",
    ]);
  });

  it("skips a suffix already used by an earlier heading", () => {
    expect(slugs("Setup 1", "Setup", "Setup")).toEqual([
      "h-setup-1",
      "h-setup",
      "h-setup-2",
    ]);
  });
});
