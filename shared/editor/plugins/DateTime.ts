import { InputRule } from "prosemirror-inputrules";
import {
  getCurrentDateAsString,
  getCurrentDateTimeAsString,
  getCurrentTimeAsString,
} from "../../utils/date";
import Extension from "../lib/Extension";
import { EventType } from "../types";

/**
 * An editor extension that adds commands to insert the current date and time.
 */
export default class DateTime extends Extension {
  get name() {
    return "date_time";
  }

  inputRules() {
    return [
      // Note: There is a space at the end of the pattern here otherwise the
      //  /datetime rule can never be matched.
      new InputRule(/\/date\s$/, ({ tr }, _match, start, end) => {
        tr.delete(start, end).insertText(getCurrentDateAsString() + " ");
        this.editor.events.emit(EventType.blockMenuClose);
        return tr;
      }),
      new InputRule(/\/time$/, ({ tr }, _match, start, end) => {
        tr.delete(start, end).insertText(getCurrentTimeAsString() + " ");
        this.editor.events.emit(EventType.blockMenuClose);
        return tr;
      }),
      new InputRule(/\/datetime$/, ({ tr }, _match, start, end) => {
        tr.delete(start, end).insertText(`${getCurrentDateTimeAsString()} `);
        this.editor.events.emit(EventType.blockMenuClose);
        return tr;
      }),
    ];
  }
}
