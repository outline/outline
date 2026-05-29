import crypto from "node:crypto";
import { Node } from "prosemirror-model";
import { ProsemirrorHelper as ServerProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { parser, schema, serializer } from "@server/editor";

// Note: The test is here rather than shared to access the schema
describe("#ProsemirrorHelper", () => {
  describe("#trim", () => {
    it("Does not remove single paragraph", () => {
      const doc = Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  ",
              },
            ],
          },
        ],
      });

      expect(ProsemirrorHelper.trim(doc).toJSON()).toEqual({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  ",
              },
            ],
          },
        ],
      });
    });

    it("Removes empty first paragraph", () => {
      const doc = Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  ",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "one",
              },
            ],
          },
        ],
      });

      expect(ProsemirrorHelper.trim(doc).toJSON()).toEqual({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "one",
              },
            ],
          },
        ],
      });
    });

    it("Removes empty last paragraph", () => {
      const doc = Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "nice",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  ",
              },
            ],
          },
        ],
      });

      expect(ProsemirrorHelper.trim(doc).toJSON()).toEqual({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "nice",
              },
            ],
          },
        ],
      });
    });

    it("Removes multiple empty paragraphs", () => {
      const doc = Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "paragraph",
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "   ",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "nice",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  ",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: " ",
              },
            ],
          },
        ],
      });

      expect(ProsemirrorHelper.trim(doc).toJSON()).toEqual({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "nice",
              },
            ],
          },
        ],
      });
    });
  });

  describe("table markdown round trip", () => {
    const roundTrip = (md: string) => {
      const doc = parser.parse(md);
      expect(doc).not.toBeNull();
      const first = serializer.serialize(doc!);
      const second = serializer.serialize(parser.parse(first)!);
      return { first, second };
    };

    const getCellTexts = (md: string) => {
      const doc = parser.parse(md)!;
      const table = doc.content.firstChild!;
      expect(table.type.name).toBe("table");
      const rows: string[][] = [];
      table.forEach((row) => {
        const cells: string[] = [];
        row.forEach((cell) => cells.push(cell.textContent));
        rows.push(cells);
      });
      return rows;
    };

    it("preserves a single inline code span containing pipes", () => {
      const cells = getCellTexts(
        ["| A | B |", "| --- | --- |", "| x | `|y|` |", ""].join("\n")
      );

      expect(cells).toEqual([
        ["A", "B"],
        ["x", "|y|"],
      ]);
    });

    it("preserves multiple inline code spans with pipes in the same cell", () => {
      const md = [
        "| Condition | Facts |",
        "| --- | --- |",
        "| Absolute time difference | The system checks `|Clock_NTP_Camera1 - Clock_GPS_Camera1|` and `|Clock_NTP_Camera2 - Clock_GPS_Camera2|`. |",
        "",
      ].join("\n");

      const cells = getCellTexts(md);
      expect(cells).toHaveLength(2);
      expect(cells[1][0]).toBe("Absolute time difference");
      expect(cells[1][1]).toBe(
        "The system checks |Clock_NTP_Camera1 - Clock_GPS_Camera1| and |Clock_NTP_Camera2 - Clock_GPS_Camera2|."
      );
    });

    it("preserves inline math containing pipes", () => {
      const cells = getCellTexts(
        ["| A | B |", "| --- | --- |", "| x | $|a-b|$ |", ""].join("\n")
      );

      expect(cells[1][0]).toBe("x");
      expect(cells[1][1]).toBe("|a-b|");
    });

    it("preserves identifiers with underscores and braces inside code spans", () => {
      const cells = getCellTexts(
        [
          "| Field | Value |",
          "| --- | --- |",
          "| ID | `foo_{bar}|baz_{qux}` |",
          "",
        ].join("\n")
      );

      expect(cells[1][1]).toBe("foo_{bar}|baz_{qux}");
    });

    it("re-serializes a table with code-span pipes idempotently", () => {
      const { first, second } = roundTrip(
        ["| A | B |", "| --- | --- |", "| x | `|y|` |", ""].join("\n")
      );

      expect(second).toBe(first);
    });

    it("re-serializes a table with prose plus code-span pipes idempotently", () => {
      const { first, second } = roundTrip(
        [
          "| Condition | Facts |",
          "| --- | --- |",
          "| Absolute time difference | The system checks `|Clock_NTP - Clock_GPS|`. |",
          "",
        ].join("\n")
      );

      expect(second).toBe(first);
    });

    it("re-serializes a table with inline math pipes idempotently", () => {
      const { first, second } = roundTrip(
        ["| A | B |", "| --- | --- |", "| x | $|a-b|$ |", ""].join("\n")
      );

      expect(second).toBe(first);
    });

    it("still splits cells on unescaped pipes outside code spans", () => {
      const cells = getCellTexts(
        ["| A | B | C |", "| --- | --- | --- |", "| x | y | z |", ""].join("\n")
      );

      expect(cells[1]).toEqual(["x", "y", "z"]);
    });
  });

  describe("#removeMarks", () => {
    it("preserves table cell background color when removing comment marks", () => {
      const doc = Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "table",
            content: [
              {
                type: "tr",
                content: [
                  {
                    type: "td",
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                      alignment: null,
                      colwidth: null,
                      marks: [
                        {
                          type: "background",
                          attrs: { color: "#e8f5e9" },
                        },
                        {
                          type: "comment",
                          attrs: { id: "comment-1" },
                        },
                      ],
                    },
                    content: [{ type: "paragraph" }],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = ServerProsemirrorHelper.removeMarks(doc, ["comment"]);
      const tdAttrsMarks = result.content?.[0]?.content?.[0]?.content?.[0]
        ?.attrs?.marks as Array<{ type: string }> | undefined;

      expect(tdAttrsMarks?.find((m) => m.type === "background")).toBeDefined();
      expect(tdAttrsMarks?.find((m) => m.type === "comment")).toBeUndefined();
    });

    it("removes comment marks from text nodes when duplicating", () => {
      const doc = Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Hello",
                marks: [
                  {
                    type: "comment",
                    attrs: { id: "comment-2", userId: crypto.randomUUID() },
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = ServerProsemirrorHelper.removeMarks(doc, ["comment"]);
      const textMarks = result.content?.[0]?.content?.[0]?.marks as
        | Array<{ type: string }>
        | undefined;

      expect(textMarks?.find((m) => m.type === "comment")).toBeUndefined();
    });
  });
});
