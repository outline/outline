export function emojiToUrl(text: string) {
  return `data:image/svg+xml;data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${text}</text></svg>`;
}

/**
 * Generates a valid emoji name from a filename by:
 * - Removing file extension
 * - Converting to lowercase
 * - Replacing spaces and dashes with underscores
 * - Removing invalid characters (only allowing lowercase letters and underscores)
 * - Removing numbers
 * - Removing leading/trailing underscores
 *
 * @param filename the name of the file.
 * @returns a valid emoji name string.
 */
export function generateEmojiNameFromFilename(filename: string): string {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");

  // Convert to lowercase, replace spaces and dashes with underscores
  let name = nameWithoutExt
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");

  // Remove all characters that aren't lowercase letters or underscores (including numbers)
  name = name.replace(/[^a-z_]/g, "");

  // Remove leading/trailing underscores and collapse multiple underscores
  name = name.replace(/^_+|_+$/g, "").replace(/_+/g, "_");

  return name;
}
