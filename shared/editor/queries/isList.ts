import { Node, Schema } from "prosemirror-model";

/**
 * Check if a node is a list node.
 *
 * @param node The node to check
 * @param schema The schema to check against
 * @returns True if the node is a list node, false otherwise
 */
export function isList(node: Node, schema: Schema) {
  return (
    node.type === schema.nodes.bullet_list ||
    node.type === schema.nodes.ordered_list ||
    node.type === schema.nodes.checkbox_list
  );
}
