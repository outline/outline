import fractionalIndex from "fractional-index";
import { StarredIcon } from "outline-icons";
import * as React from "react";
import { ConnectDragSource, useDrag, useDrop } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTheme } from "styled-components";
import { NavigationNode } from "@shared/types";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import GroupMembership from "~/models/GroupMembership";
import Star from "~/models/Star";
import UserMembership from "~/models/UserMembership";
import Icon from "~/components/Icon";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { DragObject } from "../components/SidebarLink";
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
  const accept = [
    "document",
    "collection",
    "userMembership",
    "groupMembership",
  ];
  const { documents, stars, collections, userMemberships, groupMemberships } =
    useStores();

  return useDrop<
    DragObject,
    Promise<void>,
    { isOverCursor: boolean; isDragging: boolean }
  >({
    accept,
    drop: async (item, monitor) => {
      const type = monitor.getItemType();
      let model;

      if (type === "collection") {
        model = collections.get(item.id);
      } else if (type === "userMembership") {
        model = userMemberships.get(item.id)?.document;
      } else if (type === "groupMembership") {
        model = groupMemberships.get(item.id)?.document;
      } else {
        model = documents.get(item.id);
      }
      await model?.star(
        getIndex?.() ?? fractionalIndex(null, stars.orderedData[0].index)
      );
    },
    collect: (monitor) => ({
      isOverCursor: !!monitor.isOver(),
      isDragging: accept.includes(String(monitor.getItemType())),
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

  return useDrop<
    DragObject,
    Promise<void>,
    { isOverCursor: boolean; isDragging: boolean }
  >({
    accept: "star",
    drop: async (item) => {
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

/**
 * Hook for shared logic that allows dragging documents.
 *
 * @param node The NavigationNode model to drag.
 * @param depth The depth of the node in the sidebar.
 * @param document The related Document model.
 */
export function useDragDocument(
  node: NavigationNode,
  depth: number,
  document?: Document
) {
  const icon = document?.icon || node.icon || node.emoji;
  const color = document?.color || node.color;

  const [{ isDragging }, draggableRef, preview] = useDrag<
    DragObject,
    Promise<void>,
    { isDragging: boolean }
  >({
    type: "document",
    item: () =>
      ({
        ...node,
        depth,
        icon: icon ? <Icon value={icon} color={color} /> : undefined,
        collectionId: document?.collectionId || "",
      } as DragObject),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  React.useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  return [{ isDragging }, draggableRef] as const;
}

/**
 * Hook for shared logic that allows dropping documents to reparent
 *
 * @param node The NavigationNode model to drop.
 * @param setExpanded A function to expand the parent node.
 * @param parentRef A ref to the parent element that will be used to detect when the user is no longer hovering..
 */
export function useDropToReparentDocument(
  node: NavigationNode | undefined,
  setExpanded: () => void,
  parentRef: React.RefObject<HTMLDivElement>
) {
  const { documents, policies } = useStores();
  const hasChildDocuments = !!node?.children.length;
  const document = node ? documents.get(node.id) : undefined;
  const pathToNode = React.useMemo(
    () => document?.pathTo.map((item) => item.id),
    [document]
  );

  const hoverExpanding = React.useRef<ReturnType<typeof setTimeout>>();

  // We set a timeout when the user first starts hovering over the document link,
  // to trigger expansion of children. Clear this timeout when they stop hovering.
  React.useEffect(() => {
    const resetHoverExpanding = () => {
      if (hoverExpanding.current) {
        clearTimeout(hoverExpanding.current);
        hoverExpanding.current = undefined;
      }
    };

    parentRef.current?.addEventListener("dragleave", resetHoverExpanding);

    return () => {
      parentRef.current?.removeEventListener("dragleave", resetHoverExpanding);
    };
  }, [parentRef]);

  return useDrop<
    DragObject,
    Promise<void>,
    { isOverReparent: boolean; canDropToReparent: boolean }
  >({
    accept: "document",
    drop: async (item, monitor) => {
      if (monitor.didDrop() || !node) {
        return;
      }
      await documents.move({
        documentId: item.id,
        parentDocumentId: node.id,
      });
      setExpanded();
    },
    canDrop: (item, monitor) =>
      !!node &&
      !!pathToNode &&
      !pathToNode.includes(monitor.getItem().id) &&
      item.id !== node.id &&
      policies.abilities(node.id).update &&
      policies.abilities(item.id).move,
    hover: (_item, monitor) => {
      // Enables expansion of document children when hovering over the document
      // for more than half a second.
      if (
        hasChildDocuments &&
        monitor.canDrop() &&
        monitor.isOver({
          shallow: true,
        })
      ) {
        if (!hoverExpanding.current) {
          hoverExpanding.current = setTimeout(() => {
            hoverExpanding.current = undefined;

            if (monitor.isOver({ shallow: true })) {
              setExpanded();
            }
          }, 500);
        }
      }
    },
    collect: (monitor) => ({
      isOverReparent: monitor.isOver({ shallow: true }),
      canDropToReparent: monitor.canDrop(),
    }),
  });
}

/**
 * Hook for shared logic that allows dropping documents to reorder
 *
 * @param node The NavigationNode model to drop.
 * @param collection The related Collection model, if published
 * @param getMoveParams A function to get the move parameters for the document.
 */
export function useDropToReorderDocument(
  node: NavigationNode,
  collection: Collection | undefined,
  getMoveParams: (item: DragObject) =>
    | undefined
    | {
        documentId: string;
        collectionId: string;
        parentDocumentId: string | undefined;
        index: number;
      }
) {
  const { t } = useTranslation();
  const { documents, policies } = useStores();

  return useDrop<
    DragObject,
    Promise<void>,
    { isOverReorder: boolean; isDraggingAnyDocument: boolean }
  >({
    accept: "document",
    canDrop: (item: DragObject) => {
      if (item.id === node.id) {
        return false;
      }

      return policies.abilities(item.id)?.move;
    },
    drop: async (item) => {
      if (!collection?.isManualSort && item.collectionId === collection?.id) {
        toast.message(
          t(
            "You can't reorder documents in an alphabetically sorted collection"
          )
        );
        return;
      }

      const params = getMoveParams(item);
      if (params) {
        void documents.move(params);
      }
    },
    collect: (monitor) => ({
      isOverReorder: monitor.isOver(),
      isDraggingAnyDocument: monitor.canDrop(),
    }),
  });
}

/**
 * Hook for shared logic that allows dragging user memberships.
 *
 * @param membership The UserMembership or GroupMembership model to drag.
 */
export function useDragMembership(
  membership: UserMembership | GroupMembership
) {
  const id = membership.id;
  const { label: title, icon } = useSidebarLabelAndIcon(membership);

  const [{ isDragging }, draggableRef, preview] = useDrag<
    DragObject,
    Promise<void>,
    { isDragging: boolean }
  >({
    type:
      membership instanceof UserMembership
        ? "userMembership"
        : "groupMembership",
    item: () =>
      ({
        id,
        title,
        icon,
      } as DragObject),
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  React.useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  return [{ isDragging }, draggableRef] as const;
}

/**
 * Hook for shared logic that allows dropping user memberships to reorder
 *
 * @param getIndex A function to get the index of the current item where the membership should be inserted.
 */
export function useDropToReorderUserMembership(getIndex?: () => string) {
  const { userMemberships } = useStores();
  const user = useCurrentUser();

  return useDrop<
    DragObject,
    Promise<void>,
    { isOverCursor: boolean; isDragging: boolean }
  >({
    accept: "userMembership",
    drop: async (item) => {
      const userMembership = userMemberships.get(item.id);
      void userMembership?.save({
        index:
          getIndex?.() ??
          fractionalIndex(null, user.documentMemberships[0].index),
      });
    },
    collect: (monitor) => ({
      isOverCursor: !!monitor.isOver(),
      isDragging: monitor.getItemType() === "userMembership",
    }),
  });
}
