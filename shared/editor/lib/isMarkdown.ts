export default function isMarkdown(text: string): boolean {
  let signals = 0;
  const lines = text.split("\n").length;
  const minConfidence = Math.min(3, Math.floor(lines / 5));

  // code-ish
  const fences = text.match(/^```/gm);
  if (fences && fences.length > 1) {
    signals += fences.length;
  }

  // latex-ish, the delimiters must hug their content and the closing one must
  // not be followed by a digit so that currency amounts are not counted.
  const latex = text.match(/\$[^\s$](?:[^$\n]*[^\s$])?\$(?!\d)/g);
  if (latex && latex.length > 0) {
    signals += latex.length;
  }

  // link-ish, text and destination stop at the next bracket so matching stays linear.
  const links = text.match(/\[[^[\]\n]+\]\(https?:\/\/[^\s)[]+\)/g);
  if (links) {
    signals += links.length * 2;
  }

  const relativeLinks = text.match(/\[[^[\]\n]+\]\(\/[^\s)[]+\)/g);
  if (relativeLinks) {
    signals += relativeLinks.length * 2;
  }

  // heading-ish
  const headings = text.match(/^#{1,6}\s+\S+/gm);
  if (headings) {
    signals += headings.length;
  }

  // list-ish
  const listItems = text.match(/^[-*]\s\S+/gm);
  if (listItems) {
    signals += listItems.length;
  }

  // table header-ish
  const tables = text.match(/\|\s?[:-]+\s?\|/gm);
  if (tables) {
    signals += tables.length;
  }

  return signals > minConfidence;
}
