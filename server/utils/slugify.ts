import type * as PinyinPro from "pinyin-pro";
import slug from "slug";

slug.defaults.mode = "rfc3986";

const hanRegex = /\p{Script=Han}/u;
const kanaRegex = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;

/**
 * Convert a string to a slug that can be used in a URL in kebab-case format,
 * and remove periods. Chinese characters are converted to tone-free Pinyin.
 *
 * @param text The text to convert
 * @returns The slugified text
 */
export default function slugify(text: string): string {
  // slug throws on malformed strings, so replace unpaired surrogates first.
  let input = text.toWellFormed();

  // Pinyin readings are incorrect for Japanese, so skip text with kana.
  if (hanRegex.test(input) && !kanaRegex.test(input)) {
    input = loadPinyin()(input, {
      toneType: "none",
      nonZh: "consecutive",
      v: true,
    });
  }

  return slug(input, {
    remove: /[.]/g,
  });
}

function loadPinyin(): typeof PinyinPro.pinyin {
  // oxlint-disable-next-line typescript/no-require-imports -- kept lazy so the Pinyin dictionary stays off the startup path
  const pinyinPro = require("pinyin-pro") as typeof PinyinPro;
  return pinyinPro.pinyin;
}
