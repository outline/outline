import { ellipsis, smartQuotes } from "prosemirror-inputrules";
import Extension from "@shared/editor/lib/Extension";
import { InputRule } from "@shared/editor/lib/InputRule";

const rightArrow = new InputRule(/->$/, "→");
const emdash = new InputRule(/--$/, "—");
const oneHalf = new InputRule(/(?:^|\s)1\/2$/, "½");
const threeQuarters = new InputRule(/(?:^|\s)3\/4$/, "¾");
const copyright = new InputRule(/\(c\)$/, "©️");
const registered = new InputRule(/\(r\)$/, "®️");
const trademarked = new InputRule(/\(tm\)$/, "™️");

export default class SmartText extends Extension {
  get name() {
    return "smart_text";
  }

  inputRules() {
    return [
      rightArrow,
      emdash,
      oneHalf,
      threeQuarters,
      copyright,
      registered,
      trademarked,
      ellipsis,
      ...smartQuotes,
    ];
  }
}
