import stores from "~/stores";
import Template from "./Template";

describe("Template model", () => {
  const templates = stores.templates;

  describe("revert", () => {
    it("should restore fields to their last persisted values", () => {
      const template = new Template(
        {
          id: "123",
          title: "Original",
          icon: "😀",
        },
        templates
      );

      template.title = "Edited";
      template.icon = "🎉";
      expect(template.isDirty()).toBe(true);

      template.revert();
      expect(template.title).toBe("Original");
      expect(template.icon).toBe("😀");
      expect(template.isDirty()).toBe(false);
    });

    it("should keep an unsaved model marked as new", () => {
      const template = new Template({ title: "" }, templates);

      template.title = "Edited";
      template.revert();
      expect(template.isNew).toBe(true);
    });

    it("should be a no-op when there are no local changes", () => {
      const template = new Template(
        {
          id: "124",
          title: "Original",
        },
        templates
      );

      template.revert();
      expect(template.title).toBe("Original");
      expect(template.isDirty()).toBe(false);
    });
  });
});
