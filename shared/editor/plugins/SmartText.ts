import { ellipsis, smartQuotes, InputRule } from "prosemirror-inputrules";
import Extension from "../lib/Extension";

const rightArrow = new InputRule(/->$/, "→");
const oneHalf = new InputRule(/1\/2$/, "½");
const threeQuarters = new InputRule(/3\/4$/, "¾");
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
