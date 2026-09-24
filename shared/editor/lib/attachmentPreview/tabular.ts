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

/** Converts a downloaded attachment into the sheets of a tabular preview. */
export type SheetParser = (response: Response) => Promise<PreviewSheet[]>;

/**
 * Parses a delimiter separated file (CSV, TSV) into a single preview sheet.
 * The delimiter is detected automatically. The parser is loaded on demand so
 * it stays out of the main bundle.
 *
 * @param response - the downloaded attachment.
 * @returns a list containing the one sheet of the file.
 */
export async function parseCsv(response: Response): Promise<PreviewSheet[]> {
  const [{ parse }, text] = await Promise.all([
    import("papaparse"),
    response.text(),
  ]);

  const builder = new SheetBuilder();
  const { data } = parse<string[]>(text, { skipEmptyLines: "greedy" });
  data.forEach((cells) => builder.add(cells));

  return [builder.build("")];
}

/**
 * Parses the visible worksheets of an Excel (.xlsx) workbook into preview
 * sheets, using the formatted text of each cell. The parser is loaded on
 * demand so it stays out of the main bundle.
 *
 * @param response - the downloaded attachment.
 * @returns the visible sheets of the workbook, in workbook order.
 */
export async function parseXlsx(response: Response): Promise<PreviewSheet[]> {
  const [{ Workbook }, buffer] = await Promise.all([
    import("exceljs"),
    response.arrayBuffer(),
  ]);

  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);

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
