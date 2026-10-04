import { v4 as uuidv4 } from "uuid";
import { MentionType } from "../types";
import { toISODate, toISODateTime } from "./date";

export type DateMentionKind = "date" | "time" | "datetime";

/**
 * Creates a date or time mention that can be formatted for each reader.
 *
 * @param kind The part of the date to show.
 * @param date The date to capture at insertion time.
 * @returns the ProseMirror mention data.
 */
export function createDateMention(kind: DateMentionKind, date = new Date()) {
  const modelId = kind === "date" ? toISODate(date) : toISODateTime(date);

  return {
    type: "mention",
    attrs: {
      id: uuidv4(),
      type: kind === "time" ? MentionType.Time : MentionType.Date,
      modelId,
      label: modelId,
    },
  };
}
