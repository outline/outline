import markdownit from "markdown-it";
import tablesRule from "./tables";

type Cell = { content: string };

function parseRows(md: string): Cell[][] {
  const parser = markdownit("default").use(tablesRule);
  const tokens = parser.parse(md, {});

  const rows: Cell[][] = [];
  let row: Cell[] | null = null;

  for (const token of tokens) {
    if (token.type === "tr_open") {
      row = [];
    } else if (token.type === "tr_close" && row) {
      rows.push(row);
      row = null;
    } else if ((token.type === "th_open" || token.type === "td_open") && row) {
      // The next inline token holds the cell text.
      row.push({ content: "" });
    } else if (token.type === "inline" && row && row.length > 0) {
      row[row.length - 1].content = token.content;
    }
  }

  return rows;
}

describe("table rule", () => {
  describe("pipes inside code spans", () => {
    it("does not split a cell on pipes inside a backtick code span", () => {
      const md = ["| A | B |", "| --- | --- |", "| x | `|y|` |", ""].join("\n");

      const rows = parseRows(md);

      expect(rows).toHaveLength(2);
      expect(rows[0].map((c) => c.content)).toEqual(["A", "B"]);
      expect(rows[1].map((c) => c.content)).toEqual(["x", "`|y|`"]);
    });

    it("preserves multiple code-spanned expressions with pipes in one cell", () => {
      const md = [
        "| Condition | Facts |",
        "| --- | --- |",
        "| Absolute time difference | The system checks `|Clock_NTP - Clock_GPS|` and `|Clock_NTP2 - Clock_GPS2|`. |",
        "",
      ].join("\n");

      const rows = parseRows(md);

      expect(rows).toHaveLength(2);
      expect(rows[1]).toHaveLength(2);
      expect(rows[1][0].content).toBe("Absolute time difference");
      expect(rows[1][1].content).toBe(
        "The system checks `|Clock_NTP - Clock_GPS|` and `|Clock_NTP2 - Clock_GPS2|`."
      );
    });

    it("handles double-backtick code spans containing single backticks and pipes", () => {
      const md = ["| A | B |", "| --- | --- |", "| x | ``a|b`c`` |", ""].join(
        "\n"
      );

      const rows = parseRows(md);

      expect(rows[1].map((c) => c.content)).toEqual(["x", "``a|b`c``"]);
    });

    it("still treats unfenced pipes as cell separators", () => {
      const md = [
        "| A | B | C |",
        "| --- | --- | --- |",
        "| x | y | z |",
        "",
      ].join("\n");

      const rows = parseRows(md);

      expect(rows[1].map((c) => c.content)).toEqual(["x", "y", "z"]);
    });

    it("treats backslash-escaped pipes inside code spans as literal", () => {
      const md = ["| A | B |", "| --- | --- |", "| x | `\\|y\\|` |", ""].join(
        "\n"
      );

      const rows = parseRows(md);

      // Backslash escapes are not processed inside code spans, but the
      // pipes are inside the code span so they must not split the cell.
      expect(rows[1]).toHaveLength(2);
      expect(rows[1][0].content).toBe("x");
      // The cell should still contain the original code-span text (the
      // exact serialized form is not important here, but it must not be
      // truncated).
      expect(rows[1][1].content).toContain("y");
      expect(rows[1][1].content).toContain("|");
    });
  });

  describe("pipes inside inline math", () => {
    it("does not split a cell on pipes inside $...$ math", () => {
      const md = ["| A | B |", "| --- | --- |", "| x | $|a-b|$ |", ""].join(
        "\n"
      );

      const rows = parseRows(md);

      expect(rows[1]).toHaveLength(2);
      expect(rows[1][1].content).toBe("$|a-b|$");
    });

    it("does not treat lone dollar signs as math openers", () => {
      const md = ["| A | B |", "| --- | --- |", "| $5 | $10 |", ""].join("\n");

      const rows = parseRows(md);

      // Lone dollar amounts shouldn't open math spans and merge cells.
      expect(rows[1].map((c) => c.content)).toEqual(["$5", "$10"]);
    });
  });

  describe("backslash escapes outside code spans", () => {
    it("still honors \\| as an escaped cell-pipe", () => {
      const md = ["| A | B |", "| --- | --- |", "| x | a\\|b |", ""].join("\n");

      const rows = parseRows(md);

      expect(rows[1]).toHaveLength(2);
      expect(rows[1][1].content).toContain("|");
    });
  });
});
