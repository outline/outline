import { Schema } from "prosemirror-model";

/**
 * Generate a map of text serializers for a given schema
 * @param schema
 * @returns Text serializers
 */
export function getTextSerializers(schema: Schema) {
  return Object.fromEntries(
    Object.entries(schema.nodes)
      .filter(([, node]) => node.spec.toPlainText)
      .map(([name, node]) => [name, node.spec.toPlainText])
  );
}
