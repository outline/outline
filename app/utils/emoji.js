// @flow

export function toCodePoint(unicodeSurrogates, sep) {
  var r = [],
    c = 0,
    p = 0,
    i = 0;
  while (i < unicodeSurrogates.length) {
    c = unicodeSurrogates.charCodeAt(i++);
    if (p) {
      r.push((0x10000 + ((p - 0xd800) << 10) + (c - 0xdc00)).toString(16));
      p = 0;
    } else if (0xd800 <= c && c <= 0xdbff) {
      p = c;
    } else {
      r.push(c.toString(16));
    }
  }
  return r.join(sep || '-');
}

export function emojiToUrl(string: text) {
  return `https://twemoji.maxcdn.com/2/72x72/${toCodePoint(string)}.png`;
}
