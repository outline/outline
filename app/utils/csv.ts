/**
 * Escapes a CSV field value by wrapping it in quotes if necessary.
 *
 * @param value The value to escape.
 * @returns The escaped value.
 */
function escapeCSVField(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Converts an array of objects to CSV format.
 *
 * @param data Array of objects to convert.
 * @param headers Array of header names in the desired order.
 * @returns CSV string.
 */
export function convertToCSV(
  data: Record<string, any>[],
  headers: string[]
): string {
  if (data.length === 0) {
    return headers.join(",") + "\n";
  }

  // Create header row
  const headerRow = headers.map(escapeCSVField).join(",");

  // Create data rows
  const dataRows = data.map((row) =>
    headers.map((header) => escapeCSVField(row[header])).join(",")
  );

  return [headerRow, ...dataRows].join("\n");
}
