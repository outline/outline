import normalizePastedMarkdown from "./normalize";

describe("normalizePastedMarkdown", () => {
  describe("checkbox normalization", () => {
    it("should wrap standalone checkbox with list item prefix", () => {
      const input = "[x] Task one";
      const expected = "- [x] Task one";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should wrap standalone checkbox with uppercase X", () => {
      const input = "[X] Task two";
      const expected = "- [X] Task two";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should wrap standalone unchecked checkbox", () => {
      const input = "[ ] Task three";
      const expected = "- [ ] Task three";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should wrap standalone checkbox with underscore", () => {
      const input = "[_] Task four";
      const expected = "- [_] Task four";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should wrap standalone checkbox with dash", () => {
      const input = "[-] Task five";
      const expected = "- [-] Task five";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should wrap multiple standalone checkboxes", () => {
      const input = "[x] Task one\n[X] Task two\n[ ] Task three";
      const expected = "- [x] Task one\n- [X] Task two\n- [ ] Task three";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should wrap checkbox with single leading space", () => {
      const input = " [x] Task with spaces";
      const expected = "- [x] Task with spaces";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should not modify checkboxes already in list items", () => {
      const input = "- [x] Already in list";
      const expected = "- [x] Already in list";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should not match checkbox without space after bracket", () => {
      const input = "[x]";
      const expected = "[x]";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should handle checkbox with space but no description text", () => {
      const input = "[x] ";
      const expected = "- [x]";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should not match checkbox with multiple leading spaces", () => {
      const input = "  [x] Task";
      const expected = "  [x] Task";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });
  });

  describe("multiple newlines normalization", () => {
    it("should replace three newlines with hard break", () => {
      const input = "Line one\n\n\nLine two";
      const expected = "Line one\n\n\\\nLine two";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should replace four newlines with hard break", () => {
      const input = "Line one\n\n\n\nLine two";
      const expected = "Line one\n\n\\\nLine two";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should replace five or more newlines with hard break", () => {
      const input = "Line one\n\n\n\n\nLine two";
      const expected = "Line one\n\n\\\nLine two";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should not modify single newlines", () => {
      const input = "Line one\nLine two";
      const expected = "Line one\nLine two";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should not modify double newlines", () => {
      const input = "Line one\n\nLine two";
      const expected = "Line one\n\nLine two";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should handle multiple instances of three or more newlines", () => {
      const input = "Line one\n\n\nLine two\n\n\n\nLine three";
      const expected = "Line one\n\n\\\nLine two\n\n\\\nLine three";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });
  });

  describe("combined normalization", () => {
    it("should apply checkbox normalization first then newline normalization", () => {
      // Note: checkbox wrapping reduces newlines from 3 to 2 between checkboxes
      const input = "[x] Task one\n\n\n[X] Task two";
      const expected = "- [x] Task one\n\n- [X] Task two";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should handle mixed content with checkboxes and multiple newlines", () => {
      // Note: checkbox at start of line consumes one newline during wrapping
      const input = "Regular text\n\n\n[x] Checkbox task\n\n\nMore text";
      const expected = "Regular text\n\n- [x] Checkbox task\n\n\\\nMore text";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should handle checkbox after newline normalization", () => {
      const input = "Text\n[x] Task";
      const expected = "Text\n- [x] Task";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should preserve multiple newlines before text when no checkbox follows", () => {
      const input = "Text one\n\n\nText two";
      const expected = "Text one\n\n\\\nText two";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const input = "";
      const expected = "";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should handle text with no special formatting", () => {
      const input = "Just regular text";
      const expected = "Just regular text";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });

    it("should handle text with only newlines", () => {
      const input = "\n\n\n";
      const expected = "\n\n\\\n";
      expect(normalizePastedMarkdown(input)).toBe(expected);
    });
  });
});
