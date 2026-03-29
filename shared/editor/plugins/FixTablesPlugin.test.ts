import {
  createEditorState,
  createEditorStateWithSelection,
  doc,
  table,
  td,
  th,
  tr,
} from "@shared/test/editor";
import { FixTablesPlugin } from "./FixTablesPlugin";

describe("FixTablesPlugin", () => {
  describe("header cell fixing", () => {
    it("should convert th cells that are not in first row or first column to td", () => {
      // Create a 3x3 table with th cells in all positions (incorrect state)
      // The plugin should only convert cells where both row > 0 AND col > 0
      const testTable = table([
        tr([
          th("H1"), // (0,0) - keep th
          th("H2"), // (0,1) - keep th (first row)
          th("H3"), // (0,2) - keep th (first row)
        ]),
        tr([
          th("R1"), // (1,0) - keep th (first column)
          th("Wrong"), // (1,1) - convert to td
          th("Wrong"), // (1,2) - convert to td
        ]),
        tr([
          th("R2"), // (2,0) - keep th (first column)
          th("Wrong"), // (2,1) - convert to td
          th("Wrong"), // (2,2) - convert to td
        ]),
      ]);

      const testDoc = doc(testTable);
      const state = createEditorState(testDoc, [new FixTablesPlugin()]);

      // Simulate a transaction that triggers the plugin
      const newState = state.apply(state.tr.insertText("x", 5));

      const newTable = newState.doc.firstChild!;

      // First row should all be th (header row)
      const firstRow = newTable.child(0);
      expect(firstRow.child(0).type.name).toBe("th");
      expect(firstRow.child(1).type.name).toBe("th");
      expect(firstRow.child(2).type.name).toBe("th");

      // Second row: first column th preserved, others converted to td
      const secondRow = newTable.child(1);
      expect(secondRow.child(0).type.name).toBe("th");
      expect(secondRow.child(1).type.name).toBe("td");
      expect(secondRow.child(2).type.name).toBe("td");

      // Third row: first column th preserved, others converted to td
      const thirdRow = newTable.child(2);
      expect(thirdRow.child(0).type.name).toBe("th");
      expect(thirdRow.child(1).type.name).toBe("td");
      expect(thirdRow.child(2).type.name).toBe("td");
    });

    it("should not modify valid tables with th only in first row", () => {
      // Create a correctly structured 2x2 table
      const testTable = table([
        tr([th("Header 1"), th("Header 2")]),
        tr([td("Cell 1"), td("Cell 2")]),
      ]);

      const testDoc = doc(testTable);
      const state = createEditorState(testDoc, [new FixTablesPlugin()]);

      // Simulate a transaction
      const newState = state.apply(state.tr.insertText("x", 5));

      // Check structure is unchanged
      const newTable = newState.doc.firstChild!;
      const firstRow = newTable.child(0);
      const secondRow = newTable.child(1);

      expect(firstRow.child(0).type.name).toBe("th");
      expect(firstRow.child(1).type.name).toBe("th");
      expect(secondRow.child(0).type.name).toBe("td");
      expect(secondRow.child(1).type.name).toBe("td");
    });

    it("should preserve th in first column when used as row headers", () => {
      // Create a table with th in first column (row headers) - this is valid
      const testTable = table([
        tr([th("Header 1"), th("Header 2")]),
        tr([th("Row Header"), td("Cell")]),
      ]);

      const testDoc = doc(testTable);
      const state = createEditorState(testDoc, [new FixTablesPlugin()]);

      // Simulate a transaction
      const newState = state.apply(state.tr.insertText("x", 5));

      // Check that first column th is preserved
      const newTable = newState.doc.firstChild!;
      const secondRow = newTable.child(1);

      expect(secondRow.child(0).type.name).toBe("th");
      expect(secondRow.child(1).type.name).toBe("td");
    });

    it("should handle 2x2 table with all th - only bottom-right cell converted", () => {
      // Create a 2x2 table with th cells in all positions
      // Only the cell at (1,1) should be converted since it's not in first row or first column
      const testTable = table([
        tr([
          th("H1"), // (0,0) - keep
          th("H2"), // (0,1) - keep (first row)
        ]),
        tr([
          th("R1"), // (1,0) - keep (first column)
          th("Wrong"), // (1,1) - convert to td
        ]),
      ]);

      const testDoc = doc(testTable);
      const state = createEditorState(testDoc, [new FixTablesPlugin()]);

      // Simulate a transaction
      const newState = state.apply(state.tr.insertText("x", 5));

      const newTable = newState.doc.firstChild!;

      // First row should still be all th (header row)
      const firstRow = newTable.child(0);
      expect(firstRow.child(0).type.name).toBe("th");
      expect(firstRow.child(1).type.name).toBe("th");

      // Second row: first cell th (first column), second cell td
      const secondRow = newTable.child(1);
      expect(secondRow.child(0).type.name).toBe("th");
      expect(secondRow.child(1).type.name).toBe("td");
    });
  });

  describe("colwidth fixing for single-column tables", () => {
    it("should remove colwidth from single-column table cells when selection is in table", () => {
      // Create a single-column table with colwidth set (incorrect state)
      const testTable = table([
        tr([th("Header", { colwidth: [200] })]),
        tr([td("Cell 1", { colwidth: [200] })]),
        tr([td("Cell 2", { colwidth: [200] })]),
      ]);

      const testDoc = doc(testTable);

      // Create state with selection inside the table
      // Position 5 is inside the first cell's paragraph
      const state = createEditorStateWithSelection(testDoc, 5, [
        new FixTablesPlugin(),
      ]);

      // Simulate a transaction that modifies the document
      const newState = state.apply(state.tr.insertText("x", 5));

      // Check that colwidth is removed from all cells
      const newTable = newState.doc.firstChild!;

      newTable.forEach((row) => {
        row.forEach((cell) => {
          expect(cell.attrs.colwidth).toBeNull();
        });
      });
    });

    it("should not remove colwidth from multi-column tables", () => {
      // Create a two-column table with colwidth set (valid state)
      const testTable = table([
        tr([
          th("Header 1", { colwidth: [150] }),
          th("Header 2", { colwidth: [250] }),
        ]),
        tr([
          td("Cell 1", { colwidth: [150] }),
          td("Cell 2", { colwidth: [250] }),
        ]),
      ]);

      const testDoc = doc(testTable);
      const state = createEditorStateWithSelection(testDoc, 5, [
        new FixTablesPlugin(),
      ]);

      // Simulate a transaction
      const newState = state.apply(state.tr.insertText("x", 5));

      // Check that colwidth is preserved
      const newTable = newState.doc.firstChild!;
      const firstRow = newTable.child(0);
      const secondRow = newTable.child(1);

      expect(firstRow.child(0).attrs.colwidth).toEqual([150]);
      expect(firstRow.child(1).attrs.colwidth).toEqual([250]);
      expect(secondRow.child(0).attrs.colwidth).toEqual([150]);
      expect(secondRow.child(1).attrs.colwidth).toEqual([250]);
    });

    it("should not modify single-column tables without colwidth", () => {
      // Create a single-column table without colwidth (already correct)
      const testTable = table([tr([th("Header")]), tr([td("Cell")])]);

      const testDoc = doc(testTable);
      const state = createEditorStateWithSelection(testDoc, 5, [
        new FixTablesPlugin(),
      ]);

      // Simulate a transaction
      const newState = state.apply(state.tr.insertText("x", 5));

      // Check that structure is unchanged
      const newTable = newState.doc.firstChild!;
      expect(newTable.child(0).child(0).attrs.colwidth).toBeNull();
      expect(newTable.child(1).child(0).attrs.colwidth).toBeNull();
    });
  });

  describe("combined fixes", () => {
    it("should fix header cells regardless of selection position", () => {
      // Create a 2x2 table with th in wrong position
      const testTable = table([
        tr([th("H1"), th("H2")]),
        tr([th("R1"), th("Wrong")]), // Should become td
      ]);

      const testDoc = doc(testTable);
      const state = createEditorState(testDoc, [new FixTablesPlugin()]);

      // Simulate a transaction
      const newState = state.apply(state.tr.insertText("x", 5));

      const newTable = newState.doc.firstChild!;

      // First row: all th preserved
      expect(newTable.child(0).child(0).type.name).toBe("th");
      expect(newTable.child(0).child(1).type.name).toBe("th");

      // Second row: first column th preserved, second converted
      expect(newTable.child(1).child(0).type.name).toBe("th");
      expect(newTable.child(1).child(1).type.name).toBe("td");
    });
  });

  describe("edge cases", () => {
    it("should handle empty tables gracefully", () => {
      // Create minimal valid table
      const testTable = table([tr([td("")])]);

      const testDoc = doc(testTable);
      const state = createEditorState(testDoc, [new FixTablesPlugin()]);

      // Should not throw
      expect(() => {
        state.apply(state.tr.insertText("x", 4));
      }).not.toThrow();
    });

    it("should only fix tables that have changed (optimization)", () => {
      // Create two tables, each with th in wrong positions
      const table1 = table([
        tr([th("H1"), th("H2")]),
        tr([th("R1"), th("Wrong")]), // Should be td
      ]);

      const table2 = table([
        tr([th("H1"), th("H2"), th("H3")]),
        tr([th("R1"), th("Wrong"), th("Wrong")]), // Would be td if changed
      ]);

      const testDoc = doc([table1, table2]);
      const state = createEditorState(testDoc, [new FixTablesPlugin()]);

      // Insert text only in the first table - second table is unchanged
      const newState = state.apply(state.tr.insertText("x", 5));

      // Check first table - fixed because it was modified
      const newTable1 = newState.doc.child(0);
      expect(newTable1.child(0).child(0).type.name).toBe("th");
      expect(newTable1.child(0).child(1).type.name).toBe("th");
      expect(newTable1.child(1).child(0).type.name).toBe("th");
      expect(newTable1.child(1).child(1).type.name).toBe("td");

      // Check second table - NOT fixed because it wasn't changed
      // This is intentional optimization via changedDescendants
      const newTable2 = newState.doc.child(1);
      expect(newTable2.child(0).child(0).type.name).toBe("th");
      expect(newTable2.child(0).child(1).type.name).toBe("th");
      expect(newTable2.child(0).child(2).type.name).toBe("th");
      expect(newTable2.child(1).child(0).type.name).toBe("th");
      expect(newTable2.child(1).child(1).type.name).toBe("th"); // Still th - not changed
      expect(newTable2.child(1).child(2).type.name).toBe("th"); // Still th - not changed
    });

    it("should not modify document when no fixes needed", () => {
      // Create a perfectly valid table
      const testTable = table([
        tr([th("H1"), th("H2")]),
        tr([th("R1"), td("Cell")]),
      ]);

      const testDoc = doc(testTable);
      const state = createEditorState(testDoc, [new FixTablesPlugin()]);

      // Apply transaction
      const newState = state.apply(state.tr.insertText("x", 5));

      // The table structure should remain valid
      const newTable = newState.doc.firstChild!;
      expect(newTable.child(0).child(0).type.name).toBe("th");
      expect(newTable.child(0).child(1).type.name).toBe("th");
      expect(newTable.child(1).child(0).type.name).toBe("th");
      expect(newTable.child(1).child(1).type.name).toBe("td");
    });
  });
});
