import fractionalIndex from "fractional-index";
import { StarredIcon } from "outline-icons";
import * as React from "react";
import { ConnectDragSource, useDrag, useDrop } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { useTheme } from "styled-components";
import Star from "~/models/Star";
import UserMembership from "~/models/UserMembership";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { DragObject } from "./SidebarLink";
import { useSidebarLabelAndIcon } from "./useSidebarLabelAndIcon";

/**
 * Hook for shared logic that allows dragging a Starred item
 *
 * @param star The related Star model.
 */
export function useDragStar(
  star: Star
): [{ isDragging: boolean }, ConnectDragSource] {
  const id = star.id;
  const theme = useTheme();
  const { label: title, icon } = useSidebarLabelAndIcon(
    star,
    <StarredIcon color={theme.yellow} />
  );
  const [{ isDragging }, draggableRef, preview] = useDrag({
    type: "star",
    item: () => ({ id, title, icon }),
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
    drop: async (item: DragObject) => {
      const star = stars.get(item.id);
      void star?.save({
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

export function useDragUserMembership(
  userMembership: UserMembership
): [{ isDragging: boolean }, ConnectDragSource] {
  const id = userMembership.id;
  const { label: title, icon } = useSidebarLabelAndIcon(userMembership);

  const [{ isDragging }, draggableRef, preview] = useDrag({
    type: "userMembership",
    item: () => ({
      id,
      title,
      icon,
    }),
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
 * Hook for shared logic that allows dropping user memberships to reorder
 *
 * @param getIndex A function to get the index of the current item where the membership should be inserted.
 */
export function useDropToReorderUserMembership(getIndex?: () => string) {
  const { userMemberships } = useStores();
  const user = useCurrentUser();

  return useDrop({
    accept: "userMembership",
    drop: async (item: DragObject) => {
      const userMembership = userMemberships.get(item.id);
      void userMembership?.save({
        index: getIndex?.() ?? fractionalIndex(null, user.memberships[0].index),
      });
    },
    collect: (monitor) => ({
      isOverCursor: !!monitor.isOver(),
      isDragging: monitor.getItemType() === "userMembership",
    }),
  });
}
