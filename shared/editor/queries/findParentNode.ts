import { Node, ResolvedPos } from "prosemirror-model";
import { Selection } from "prosemirror-state";

type Predicate = (node: Node) => boolean;

type ContentNodeWithPos = {
  pos: number;
  start: number;
  depth: number;
  node: Node;
};

export const findParentNode =
  (predicate: Predicate) =>
  ({ $from }: Selection) =>
    findParentNodeClosestToPos($from, predicate);

/**
 * Iterates over parent nodes starting from the given `$pos`, returning the
 * closest node and its start position `predicate` returns truthy for. `start`
 * points to the start position of the node, `pos` points directly before the node.
 *
 * @param $pos position to start from
 * @param predicate filtering predicate function
 * @returns node and its start position
 */
export const findParentNodeClosestToPos = (
  $pos: ResolvedPos,
  predicate: Predicate
): ContentNodeWithPos | undefined => {
  for (let i = $pos.depth; i > 0; i--) {
    const node = $pos.node(i);
    if (predicate(node)) {
      return {
        pos: i > 0 ? $pos.before(i) : 0,
        start: $pos.start(i),
        depth: i,
        node,
      };
    }
  }

  return undefined;
};
