/**
 * Escapes raw block content (code & math fences) so it survives on a single
 * table-cell line. Their content bypasses the serializer's `esc()`, so the
 * backslash (the escape character) and pipe (the cell delimiter) are escaped
 * together in one pass to keep the content from breaking out of the column.
 *
 * @param text - the raw fence content.
 * @returns the escaped content, reversible with `unescapeRawTableCell`.
 */
export function escapeRawTableCell(text: string): string {
  return text.replace(/[\\|]/g, "\\$&");
}

/**
 * Reverses `escapeRawTableCell` when a fenced block is reconstructed from a
 * table cell, restoring the escaped backslashes and pipes. Markdown does not
 * unescape inside raw blocks, so this is applied during the nested re-parse.
 *
 * @param text - the escaped fence content.
 * @returns the original raw content.
 */
export function unescapeRawTableCell(text: string): string {
  return text.replace(/\\([\\|])/g, "$1");
}
