import { InputRule } from "prosemirror-inputrules";
import Extension from "../lib/Extension";
import { EventType } from "../types";

const dateOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

const timeOptions: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "numeric",
};

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
        tr.delete(start, end).insertText(
          new Date().toLocaleDateString(undefined, dateOptions) + " "
        );
        this.editor.events.emit(EventType.blockMenuClose);
        return tr;
      }),
      new InputRule(/\/time$/, ({ tr }, _match, start, end) => {
        tr.delete(start, end).insertText(
          new Date().toLocaleTimeString(undefined, timeOptions) + " "
        );
        this.editor.events.emit(EventType.blockMenuClose);
        return tr;
      }),
      new InputRule(/\/datetime$/, ({ tr }, _match, start, end) => {
        tr.delete(start, end).insertText(
          `${new Date().toLocaleDateString(
            undefined,
            dateOptions
          )}, ${new Date().toLocaleTimeString(undefined, timeOptions)} `
        );
        this.editor.events.emit(EventType.blockMenuClose);
        return tr;
      }),
    ];
  }
}
