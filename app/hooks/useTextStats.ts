export type TextStats = ReturnType<typeof getTextStats>;

/**
 * Calculate statistics for a piece of text.
 *
 * @param text The string to calculate statistics for
 * @returns An object containing the statistics
 */
export function getTextStats(text: string) {
  const words = countWords(text);

  return {
    words,
    characters: text.length,
    paragraphs: countParagraphs(text),
    readingTime: Math.ceil(words / 200),
  };
}

/**
 * Hook to calculate text statistics
 *
 * @param text The string to calculate statistics for
 * @returns An object containing the statistics
 */
export function useTextStats(text: string) {
  return getTextStats(text);
}

function countWords(text: string): number {
  const t = text.trim();

  // Hyphenated words are counted as two words
  return t ? t.replace(/-/g, " ").split(/\s+/g).length : 0;
}

function countParagraphs(text: string): number {
  return text.split("\n").filter((line) => line.trim()).length;
}
