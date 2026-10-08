import { QueryHelper } from "./QueryHelper";

describe("QueryHelper.escapeLike", () => {
  it("should escape percent signs", () => {
    expect(QueryHelper.escapeLike("100%")).toBe("100\\%");
  });

  it("should escape underscores", () => {
    expect(QueryHelper.escapeLike("a_b@example.com")).toBe("a\\_b@example.com");
  });

  it("should escape backslashes", () => {
    expect(QueryHelper.escapeLike("a\\b")).toBe("a\\\\b");
  });

  it("should leave other characters untouched", () => {
    expect(QueryHelper.escapeLike("Rocket 🚀 & co")).toBe("Rocket 🚀 & co");
  });

  it("should handle empty strings", () => {
    expect(QueryHelper.escapeLike("")).toBe("");
  });
});

describe("QueryHelper.likeContains", () => {
  it("should wrap the escaped input in wildcards", () => {
    expect(QueryHelper.likeContains("100%")).toBe("%100\\%%");
    expect(QueryHelper.likeContains("a_b")).toBe("%a\\_b%");
  });

  it("should match everything for empty input", () => {
    expect(QueryHelper.likeContains("")).toBe("%%");
  });
});
