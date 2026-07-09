import markdownit from "markdown-it";
import databases, { databaseHref, parseDatabaseHref } from "./databases";

const collectionId = "11111111-1111-4111-8111-111111111111";
const viewId = "22222222-2222-4222-8222-222222222222";

describe("databaseHref", () => {
  it("should round-trip through parseDatabaseHref", () => {
    expect(parseDatabaseHref(databaseHref(collectionId))).toEqual({
      collectionId,
      viewId: null,
    });
    expect(parseDatabaseHref(databaseHref(collectionId, viewId))).toEqual({
      collectionId,
      viewId,
    });
  });

  it("should reject other hrefs", () => {
    expect(parseDatabaseHref("https://example.com")).toBeUndefined();
    expect(parseDatabaseHref("database://not-a-uuid")).toBeUndefined();
    expect(
      parseDatabaseHref(`database://${collectionId}/extra/junk`)
    ).toBeUndefined();
  });
});

describe("databases rule", () => {
  const md = markdownit().use(databases);

  it("should convert a database link paragraph to a database token", () => {
    const tokens = md.parse(
      `[Database](${databaseHref(collectionId, viewId)})`,
      {}
    );
    const token = tokens.find((item) => item.type === "database");
    expect(token).toBeDefined();
    expect(token?.attrGet("collectionId")).toEqual(collectionId);
    expect(token?.attrGet("viewId")).toEqual(viewId);
    expect(tokens.some((item) => item.type === "paragraph_open")).toBe(false);
  });

  it("should leave regular links untouched", () => {
    const tokens = md.parse("[link](https://example.com)", {});
    expect(tokens.some((item) => item.type === "database")).toBe(false);
    expect(tokens.some((item) => item.type === "paragraph_open")).toBe(true);
  });

  it("should leave links with surrounding text untouched", () => {
    const tokens = md.parse(
      `before [Database](${databaseHref(collectionId)}) after`,
      {}
    );
    expect(tokens.some((item) => item.type === "database")).toBe(false);
  });
});
