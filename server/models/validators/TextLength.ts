import { Node } from "prosemirror-model";
import { addAttributeOptions } from "sequelize-typescript";
import type { ProsemirrorData } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { schema } from "@server/editor";

/**
 * A decorator that validates the size of the text within a prosemirror data
 * object, taking into account unicode characters of variable lengths.
 */
export default function TextLength({
  msg,
  min = 0,
  max,
}: {
  msg?: string;
  min?: number;
  max: number;
}): (target: object, propertyName: string) => void {
  return (target: object, propertyName: string) =>
    addAttributeOptions(target, propertyName, {
      validate: {
        validLength(value: ProsemirrorData) {
          let text;

          try {
            text = ProsemirrorHelper.toPlainText(Node.fromJSON(schema, value));
          } catch (_err) {
            throw new Error("Invalid data");
          }

          const length = text ? [...text].length : 0;
          if (length > max || length < min) {
            throw new Error(msg);
          }
        },
      },
    });
}
