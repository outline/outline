import type { Schema } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import {
  getCurrentDateAsString,
  getCurrentDateTimeAsString,
  getCurrentTimeAsString,
} from "../../utils/date";
import { createDateMention } from "../../utils/dateMention";
import Extension from "../lib/Extension";

/**
 * An editor extension that adds commands to insert the current date and time.
 */
export default class DateTime extends Extension {
  get name() {
    return "date_time";
  }

  commands({ schema }: { schema: Schema }) {
    const { template } = this.editor.props;

    const insertDate =
      (kind: "date" | "time" | "datetime"): Command =>
      (state, dispatch) => {
        if (template || !schema.nodes.mention) {
          const value = template
            ? `{${kind}}`
            : kind === "date"
              ? getCurrentDateAsString()
              : kind === "time"
                ? getCurrentTimeAsString()
                : getCurrentDateTimeAsString();
          dispatch?.(state.tr.insertText(value + " "));
          return true;
        }

        dispatch?.(
          state.tr
            .replaceSelectionWith(schema.nodeFromJSON(createDateMention(kind)))
            .insertText(" ")
        );
        return true;
      };

    return {
      date: () => insertDate("date"),
      time: () => insertDate("time"),
      datetime: () => insertDate("datetime"),
    };
  }
}
