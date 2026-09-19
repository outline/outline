import stores from "~/stores";
import Template from "./Template";

describe("Template model", () => {
  const templates = stores.templates;

  describe("isDraft", () => {
    it("should be true when the template has not been published", () => {
      const template = new Template(
        { id: "123", title: "Untitled" },
        templates
      );
      expect(template.isDraft).toBe(true);
    });

    it("should be false once the template has been published", () => {
      const template = new Template(
        {
          id: "124",
          title: "Untitled",
          publishedAt: "2026-08-08T00:00:00.000Z",
        },
        templates
      );
      expect(template.isDraft).toBe(false);
    });
  });

  describe("isEmpty", () => {
    it("should be true without a title or content", () => {
      const template = new Template({ id: "125", title: "" }, templates);
      expect(template.isEmpty).toBe(true);
    });

    it("should be true when the title is only whitespace", () => {
      const template = new Template({ id: "126", title: "   " }, templates);
      expect(template.isEmpty).toBe(true);
    });

    it("should be false with a title", () => {
      const template = new Template({ id: "127", title: "Weekly" }, templates);
      expect(template.isEmpty).toBe(false);
    });

    it("should be false with content", () => {
      const template = new Template(
        {
          id: "128",
          title: "",
          data: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "hello" }],
              },
            ],
          },
        },
        templates
      );
      expect(template.isEmpty).toBe(false);
    });
  });
});
