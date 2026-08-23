/**
 * Utility function to export JSON data to a CSV file and trigger a download.
 * @param data - The array of objects to export.
 * @param filename - The name of the file (e.g., 'products.csv').
 */
export const exportToCSV = (
	data: readonly Record<string, unknown>[],
	filename: string,
) => {
	if (data.length === 0) return;

	// Get headers from the first object keys
	const headers = Object.keys(data[0] || {});

	// Create CSV rows
	const csvRows = [
		headers.join(","), // Header row
		...data.map((row) =>
			headers
				.map((fieldName) => {
					const value = row[fieldName];
					const escaped = `${value}`.replace(/"/g, '""'); // Escape double quotes
					return `"${escaped}"`; // Wrap in quotes
				})
				.join(","),
		),
	];

	const csvContent = csvRows.join("\n");
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);

	const link = document.createElement("a");
	link.setAttribute("href", url);
	link.setAttribute("download", filename);
	link.style.visibility = "hidden";
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
};
