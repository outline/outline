import Extension from "@shared/editor/lib/Extension";
import { InputRule } from "@shared/editor/lib/InputRule";

const rightArrow = new InputRule(/->$/, "→");
// Note that the suppression of pipe here prevents conflict with table creation rule.
const emdash = new InputRule(/(?:^|[^\|])(--)$/, "—");
const oneHalf = new InputRule(/(?:^|\s)(1\/2)$/, "½");
const threeQuarters = new InputRule(/(?:^|\s)(3\/4)$/, "¾");
const copyright = new InputRule(/\(c\)$/, "©️");
const registered = new InputRule(/\(r\)$/, "®️");
const trademarked = new InputRule(/\(tm\)$/, "™️");
const ellipsis = new InputRule(/\.\.\.$/, "…");

// Double quotes
const openDoubleQuote = new InputRule(
  /(?:^|[\s\{\[\(\<'"\u2018\u201C])(")$/,
  "“"
);
const closeDoubleQuote = new InputRule(/^(?!.*`)[\s\S]*(")$/, "”");

// Single quotes
const openSingleQuote = new InputRule(
  /(?:^|[\s\{\[\(\<'"\u2018\u201C])(')$/,
  "‘"
);
const closeSingleQuote = new InputRule(/^(?!.*`)[\s\S]*(')$/, "’");

export default class SmartText extends Extension {
  get name() {
    return "smart_text";
  }

  inputRules() {
    if (this.options.userPreferences?.enableSmartText ?? true) {
      return [
        rightArrow,
        emdash,
        oneHalf,
        threeQuarters,
        copyright,
        registered,
        trademarked,
        ellipsis,
        openDoubleQuote,
        closeDoubleQuote,
        openSingleQuote,
        closeSingleQuote,
      ];
    }

    return [];
  }
}
