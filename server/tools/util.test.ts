import type { NavigationNode } from "@shared/types";
import { buildBreadcrumb } from "./util";

const node = (
  id: string,
  title: string,
  children: NavigationNode[] = []
): NavigationNode => ({
  id,
  title,
  url: `/doc/${id}`,
  children,
});

describe("buildBreadcrumb", () => {
  const structure: NavigationNode[] = [
    node("a", "Onboarding", [
      node("b", "Setup guide", [node("c", "Database")]),
      node("d", "Glossary"),
    ]),
    node("e", "Architecture"),
  ];

  it("returns just the collection name for a root-level document", () => {
    expect(buildBreadcrumb("a", structure, "Engineering")).toBe("Engineering");
    expect(buildBreadcrumb("e", structure, "Engineering")).toBe("Engineering");
  });

  it("includes ancestor titles for a nested document", () => {
    expect(buildBreadcrumb("b", structure, "Engineering")).toBe(
      "Engineering › Onboarding"
    );
    expect(buildBreadcrumb("c", structure, "Engineering")).toBe(
      "Engineering › Onboarding › Setup guide"
    );
  });

  it("excludes the document's own title from the path", () => {
    const result = buildBreadcrumb("c", structure, "Engineering");
    expect(result).not.toContain("Database");
  });

  it("falls back to the collection name when the document is not in the structure", () => {
    expect(buildBreadcrumb("missing", structure, "Engineering")).toBe(
      "Engineering"
    );
  });

  it("returns just the collection name when the structure is null", () => {
    expect(buildBreadcrumb("a", null, "Engineering")).toBe("Engineering");
    expect(buildBreadcrumb("a", undefined, "Engineering")).toBe("Engineering");
  });

  it("returns just the collection name when the structure is empty", () => {
    expect(buildBreadcrumb("a", [], "Engineering")).toBe("Engineering");
  });
});
