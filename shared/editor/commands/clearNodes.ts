import { Command } from "prosemirror-state";
import { liftTarget } from "prosemirror-transform";

const clearNodes = (): Command => (state, dispatch) => {
  const { tr } = state;
  const { selection } = tr;
  const { ranges } = selection;

  if (!dispatch) {
    return true;
  }

  ranges.forEach(({ $from, $to }) => {
    state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
      if (node.type.isText) {
        return;
      }

      const { doc, mapping } = tr;
      const $mappedFrom = doc.resolve(mapping.map(pos));
      const $mappedTo = doc.resolve(mapping.map(pos + node.nodeSize));
      const nodeRange = $mappedFrom.blockRange($mappedTo);

      if (!nodeRange) {
        return;
      }

      const targetLiftDepth = liftTarget(nodeRange);

      if (node.type.isTextblock) {
        const { defaultType } = $mappedFrom.parent.contentMatchAt(
          $mappedFrom.index()
        );

        tr.setNodeMarkup(nodeRange.start, defaultType);
      }

      if (targetLiftDepth || targetLiftDepth === 0) {
        tr.lift(nodeRange, targetLiftDepth);
      }
    });
  });

  dispatch(tr);
  return true;
};

export default clearNodes;
