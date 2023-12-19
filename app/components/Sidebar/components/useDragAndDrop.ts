import fractionalIndex from "fractional-index";
import * as React from "react";
import { ConnectDragSource, useDrag, useDrop } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import Star from "~/models/Star";
import useStores from "~/hooks/useStores";
import { DragObject } from "./SidebarLink";
import { useStarLabelAndIcon } from "./useStarLabelAndIcon";

/**
 * Hook for shared logic that allows dragging a Starred item
 *
 * @param star The related Star model.
 */
export function useDragStar(
  star: Star
): [{ isDragging: boolean }, ConnectDragSource] {
  const { label: title, icon } = useStarLabelAndIcon(star);
  const [{ isDragging }, draggableRef, preview] = useDrag({
    type: "star",
    item: () => ({ icon, title, star }),
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: () => true,
  });

  React.useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  return [{ isDragging }, draggableRef];
}

/**
 * Hook for shared logic that allows dropping documents and collections to create a star
 *
 * @param getIndex A function to get the index of the current item where the star should be inserted.
 */
export function useDropToCreateStar(getIndex?: () => string) {
  const { documents, stars, collections } = useStores();

  return useDrop({
    accept: ["document", "collection"],
    drop: async (item: DragObject) => {
      const model = documents.get(item.id) ?? collections?.get(item.id);
      await model?.star(
        getIndex?.() ?? fractionalIndex(null, stars.orderedData[0].index)
      );
    },
    collect: (monitor) => ({
      isOverCursor: !!monitor.isOver(),
      isDragging: ["document", "collection"].includes(
        String(monitor.getItemType())
      ),
    }),
  });
}

/**
 * Hook for shared logic that allows dropping stars to reorder
 *
 * @param getIndex A function to get the index of the current item where the star should be inserted.
 */
export function useDropToReorderStar(getIndex?: () => string) {
  const { stars } = useStores();

  return useDrop({
    accept: "star",
    drop: async (item: { star: Star }) => {
      void item.star.save({
        index:
          getIndex?.() ?? fractionalIndex(null, stars.orderedData[0].index),
      });
    },
    collect: (monitor) => ({
      isOverCursor: !!monitor.isOver(),
      isDragging: monitor.getItemType() === "star",
    }),
  });
}
