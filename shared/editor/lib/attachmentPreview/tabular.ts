/** The largest attachment, in bytes, that is downloaded and parsed for a preview. */
export const maxPreviewFileSize = 5 * 1024 * 1024;

/** The number of data rows kept for each sheet of a tabular preview. */
export const maxPreviewRows = 100;

/** The number of columns kept for each sheet of a tabular preview. */
export const maxPreviewColumns = 50;

/** One sheet of a tabular preview, capped to the preview limits. */
export interface PreviewSheet {
  /** The sheet name shown on its tab, empty for files with a single unnamed sheet. */
  name: string;
  /** The header row followed by at most maxPreviewRows data rows. */
  rows: string[][];
  /** The number of data rows in the full sheet, excluding the header row. */
  totalRows: number;
}

/** Converts the contents of a downloaded attachment into preview sheets. */
export type SheetParser = (data: ArrayBuffer) => Promise<PreviewSheet[]>;

/**
 * Parses a delimiter separated file (CSV, TSV) into a single preview sheet.
 * The delimiter is detected automatically. The parser is loaded on demand so
 * it stays out of the main bundle.
 *
 * @param data - the contents of the attachment.
 * @returns a list containing the one sheet of the file.
 */
export async function parseCsv(data: ArrayBuffer): Promise<PreviewSheet[]> {
  const { parse } = await import("papaparse");
  const text = new TextDecoder().decode(data);

  const builder = new SheetBuilder();
  const { data: rows } = parse<string[]>(text, { skipEmptyLines: "greedy" });
  rows.forEach((cells) => builder.add(cells));

  return [builder.build("")];
}

/**
 * Parses the visible worksheets of an Excel (.xlsx) workbook into preview
 * sheets, using the formatted text of each cell. The parser is loaded on
 * demand so it stays out of the main bundle.
 *
 * @param data - the contents of the attachment.
 * @returns the visible sheets of the workbook, in workbook order.
 */
export async function parseXlsx(data: ArrayBuffer): Promise<PreviewSheet[]> {
  const { Workbook } = await import("exceljs");

  const workbook = new Workbook();
  await workbook.xlsx.load(data);

  return workbook.worksheets
    .filter((sheet) => sheet.state === "visible")
    .map((sheet) => {
      const builder = new SheetBuilder();

      sheet.eachRow({ includeEmpty: false }, (row) => {
        const cells: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
          cells[columnNumber - 1] = cell.text;
        });
        // fill gaps left by columns that have no cell in this row
        builder.add(Array.from(cells, (value) => value ?? ""));
      });

      return builder.build(sheet.name);
    });
}

/**
 * Collects rows into a preview sheet, keeping only the rows and columns within
 * the preview limits while still counting every row.
 */
class SheetBuilder {
  public rows: string[][] = [];
  public count = 0;

  /**
   * Adds a row to the sheet.
   *
   * @param cells - the cell text of the row.
   */
  public add(cells: string[]) {
    this.count++;
    if (this.rows.length <= maxPreviewRows) {
      this.rows.push(cells.slice(0, maxPreviewColumns));
    }
  }

  /**
   * Builds the preview sheet from the rows added so far.
   *
   * @param name - the name of the sheet.
   * @returns the preview sheet.
   */
  public build(name: string): PreviewSheet {
    return {
      name,
      rows: this.rows,
      totalRows: Math.max(this.count - 1, 0),
    };
  }
}
