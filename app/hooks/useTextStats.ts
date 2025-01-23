import emojiRegex from "emoji-regex";

/**
 * Hook to calculate text statistics
 * @param text The string to calculate statistics for
 * @param selectedText A substring of the text to calculate statistics for
 * @returns An object containing total and selected statistics
 */
export function useTextStats(text: string, selectedText: string = "") {
  const numTotalWords = countWords(text);
  const regex = emojiRegex();
  const matches = Array.from(text.matchAll(regex));

  return {
    total: {
      words: numTotalWords,
      characters: text.length,
      emoji: matches.length ?? 0,
      readingTime: Math.max(1, Math.floor(numTotalWords / 200)),
    },
    selected: {
      words: countWords(selectedText),
      characters: selectedText.length,
    },
  };
}

function countWords(text: string): number {
  const t = text.trim();

  // Hyphenated words are counted as two words
  return t ? t.replace(/-/g, " ").split(/\s+/g).length : 0;
}
