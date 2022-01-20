import { ellipsis, smartQuotes, InputRule } from "prosemirror-inputrules";
import Extension from "../lib/Extension";

const rightArrow = new InputRule(/->$/, "→");

export default class SmartText extends Extension {
  get name() {
    return "smart_text";
  }

  inputRules() {
    return [rightArrow, ellipsis, ...smartQuotes];
  }
}
