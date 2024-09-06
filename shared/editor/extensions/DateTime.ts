import { Schema } from "prosemirror-model";
import { Command } from "prosemirror-state";
import {
  getCurrentDateAsString,
  getCurrentDateTimeAsString,
  getCurrentTimeAsString,
} from "../../utils/date";
import Extension from "../lib/Extension";

/**
 * An editor extension that adds commands to insert the current date and time.
 */
export default class DateTime extends Extension {
  get name() {
    return "date_time";
  }

  commands(_options: { schema: Schema }) {
    const { template } = this.editor.props;

    return {
      date: (): Command => (state, dispatch) => {
        dispatch?.(
          state.tr.insertText(
            (template ? "{date}" : getCurrentDateAsString()) + " "
          )
        );
        return true;
      },
      time: (): Command => (state, dispatch) => {
        dispatch?.(
          state.tr.insertText(
            (template ? "{time}" : getCurrentTimeAsString()) + " "
          )
        );
        return true;
      },
      datetime: (): Command => (state, dispatch) => {
        dispatch?.(
          state.tr.insertText(
            (template ? "{datetime}" : getCurrentDateTimeAsString()) + " "
          )
        );
        return true;
      },
    };
  }
}
