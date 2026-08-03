const escapes: [RegExp, string][] = [
  [/\\/g, "\\\\"],
  [/\*/g, "\\*"],
  [/^-/g, "\\-"],
  [/^\+ /g, "\\+ "],
  [/^(=+)/g, "\\$1"],
  [/^(#{1,6}) /g, "\\$1 "],
  [/`/g, "\\`"],
  [/^~~~/g, "\\~~~"],
  [/\[/g, "\\["],
  [/\]/g, "\\]"],
  [/\(/g, "\\("], // OLN-91
  [/\)/g, "\\)"], // OLN-91
  [/^>/g, "\\>"],
  [/_/g, "\\_"],
  [/^(\d+)\. /g, "$1\\. "],
  [/\$/g, "\\$"],
];

/**
 * Escape markdown characters in a string
 *
 * @param text - The text to escape
 * @returns The escaped text
 */
export const escape = function (text: string) {
  return escapes.reduce(function (accumulator, esc) {
    return accumulator.replace(esc[0], esc[1]);
  }, text);
};

/**
 * Unescape markdown characters in a string
 *
 * @param text - The text to unescape
 * @returns The unescaped text
 */
export const unescape = function (text: string) {
  return text.replace(/\\([\\*+-\d.])/g, "$1");
};

/**
 * Matches a markdown link or image, capturing the text between its
 * parentheses. A destination containing an unescaped closing parenthesis is
 * not matched.
 */
const linkRegex = /(!?\[[^\]]*\]\()([^)]*)(\))/g;

/**
 * Replaces the destination of every markdown link and image in a string.
 *
 * Understands the angle-bracket form used when a destination contains spaces,
 * and preserves any link title.
 *
 * @param text The markdown text to rewrite.
 * @param replace Called with each destination; return the replacement, or
 *   undefined to leave the link as it was written.
 * @returns The markdown with replaced destinations.
 */
export function replaceMarkdownLinks(
  text: string,
  replace: (href: string) => string | undefined
): string {
  return text.replace(
    linkRegex,
    (match, prefix: string, target: string, suffix: string) => {
      const leading = target.length - target.trimStart().length;
      const trimmed = target.trim();

      let href: string;
      let title: string;

      if (trimmed.startsWith("<")) {
        const end = trimmed.indexOf(">");
        if (end === -1) {
          return match;
        }
        href = trimmed.slice(1, end);
        title = target.slice(leading + end + 1);
      } else {
        [href] = trimmed.split(/\s/, 1);
        if (!href) {
          return match;
        }
        title = target.slice(leading + href.length);
      }

      const replacement = replace(href);
      return replacement === undefined
        ? match
        : `${prefix}${replacement}${title}${suffix}`;
    }
  );
}
