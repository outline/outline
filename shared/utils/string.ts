/**
 * Returns the index of the first occurrence of a substring in a string that matches a regular expression.
 *
 * @param text The string to search in.
 * @param re The regular expression to search for.
 * @param startPos The position in the string at which to begin the search. Defaults to 0.
 */
export const regexIndexOf = function (
  text: string,
  re: RegExp,
  startPos?: number
) {
  startPos = startPos || 0;

  if (!re.global) {
    const flags = "g" + (re.multiline ? "m" : "") + (re.ignoreCase ? "i" : "");
    re = new RegExp(re.source, flags);
  }

  re.lastIndex = startPos;
  const match = re.exec(text);

  if (match) {
    return match.index;
  } else {
    return -1;
  }
};

/**
 * Returns the index of the last occurrence of a substring in a string that matches a regular expression.
 *
 * @param text The string to search in.
 * @param re The regular expression to search for.
 * @param startPos The position in the string at which to begin the search. Defaults to the end of the string.
 */
export const regexLastIndexOf = function (
  text: string,
  re: RegExp,
  startPos?: number
) {
  startPos = startPos === undefined ? text.length : startPos;

  if (!re.global) {
    const flags = "g" + (re.multiline ? "m" : "") + (re.ignoreCase ? "i" : "");
    re = new RegExp(re.source, flags);
  }

  let lastSuccess = -1;
  for (let pos = 0; pos <= startPos; pos++) {
    re.lastIndex = pos;

    const match = re.exec(text);
    if (!match) {
      break;
    }

    pos = match.index;
    if (pos <= startPos) {
      lastSuccess = pos;
    }
  }

  return lastSuccess;
};
