export default function isMarkdown(text: string): boolean {
  let signals = 0;
  const lines = text.split("\n").length;
  const minConfidence = Math.min(3, Math.floor(lines / 5));

  // code-ish
  const fences = text.match(/^```/gm);
  if (fences && fences.length > 1) {
    signals += fences.length;
  }

  // latex-ish
  const latex = text.match(/\$(.+)\$/g);
  if (latex && latex.length > 0) {
    signals += latex.length;
  }

  // link-ish
  const links = text.match(/\[[^]+\]\(https?:\/\/\S+\)/gm);
  if (links) {
    signals += links.length * 2;
  }

  const relativeLinks = text.match(/\[[^]+\]\(\/\S+\)/gm);
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
