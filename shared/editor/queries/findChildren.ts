import { Node } from "prosemirror-model";
import { NodeWithPos } from "../types";

type Predicate = (node: Node) => boolean;

export function flatten(node: Node, descend = true): NodeWithPos[] {
  if (!node) {
    throw new Error('Invalid "node" parameter');
  }
  const result: NodeWithPos[] = [];
  node.descendants((child, pos) => {
    result.push({ node: child, pos });
    if (!descend) {
      return false;
    }
    return undefined;
  });
  return result;
}

/**
 * Iterates over descendants of a given `node`, returning child nodes predicate
 * returns truthy for. It doesn't descend into a node when descend argument is
 * `false` (defaults to `true`).
 *
 * @param node The node to iterate over
 * @param predicate Filtering predicate function
 * @param descend Whether to descend into a node
 * @returns Child nodes
 */
export function findChildren(
  node: Node,
  predicate: Predicate,
  descend = false
) {
  if (!node) {
    throw new Error('Invalid "node" parameter');
  } else if (!predicate) {
    throw new Error('Invalid "predicate" parameter');
  }
  return flatten(node, descend).filter((child) => predicate(child.node));
}

/**
 * Iterates over descendants of a given `node`, returning child nodes that
 * are blocks.
 *
 * @param node The node to iterate over
 * @param descend Whether to descend into a node
 * @returns Child nodes that are blocks
 */
export function findBlockNodes(node: Node, descend = false): NodeWithPos[] {
  return findChildren(node, (child) => child.isBlock, descend);
}
