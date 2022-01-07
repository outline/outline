export default function isMarkdown(text: string): boolean {
  // code-ish
  const fences = text.match(/^```/gm);
  if (fences && fences.length > 1) return true;

  // link-ish
  if (text.match(/\[[^]+\]\(https?:\/\/\S+\)/gm)) return true;
  if (text.match(/\[[^]+\]\(\/\S+\)/gm)) return true;

  // heading-ish
  if (text.match(/^#{1,6}\s+\S+/gm)) return true;

  // list-ish
  const listItems = text.match(/^[\d-*].?\s\S+/gm);
  if (listItems && listItems.length > 1) return true;

  return false;
}
