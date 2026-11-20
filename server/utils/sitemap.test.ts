import { NavigationNodeType } from "@shared/types";
import { navigationNodeToSitemap } from "./sitemap";

describe("navigationNodeToSitemap", () => {
  it("should not include links", () => {
    const xml = navigationNodeToSitemap(
      {
        id: "root",
        title: "Root",
        url: "",
        children: [
          {
            id: "doc",
            title: "Doc",
            url: "/doc/doc-abc123defg",
            children: [
              {
                id: "link",
                title: "Link",
                url: "https://example.com",
                type: NavigationNodeType.Link,
                children: [],
              },
            ],
          },
        ],
      },
      "https://outline.example/s/share"
    );

    expect(xml).toContain("https://outline.example/s/share/doc/doc-abc123defg");
    expect(xml).not.toContain("example.com<");
    expect(xml).not.toContain("sharehttps://");
  });
});
