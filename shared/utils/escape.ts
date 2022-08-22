// source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
export const escapeRegExp = (text: string) => {
  return text.replace(/[-.*+?^${}()|[\]/\\]/g, "\\$&"); // $& means the whole matched string
};
