import fractionalIndex from "fractional-index";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import Icon from "@shared/components/Icon";
import {
  type NavigationNode,
  type SidebarSection,
  UserPreference,
} from "@shared/types";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import type GroupMembership from "~/models/GroupMembership";
import type Star from "~/models/Star";
import UserMembership from "~/models/UserMembership";
import ConfirmMoveDialog from "~/components/ConfirmMoveDialog";
import { useDragRef, useDropRef } from "~/components/DragAndDrop";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { AuthorizationError } from "~/utils/errors";
import { useSidebarLabelAndIcon } from "./useSidebarLabelAndIcon";

export type DragObject = NavigationNode & {
  depth: number;
  collectionId: string;
};

/**
 * Returns functions to start and cancel a timer that calls the callback once
 * an item has been held over a target for half a second.
 *
 * @param callback The function to call.
 * @returns a tuple of the start and cancel functions.
 */
function useHoverTimer(callback: () => void) {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const callbackRef = React.useRef(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  });

  const start = React.useCallback(() => {
    if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = undefined;
        callbackRef.current();
      }, 500);
    }
  }, []);

  const cancel = React.useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
  }, []);

  React.useEffect(() => cancel, [cancel]);

  return [start, cancel] as const;
}

/**
 * Hook for shared logic that allows dragging a Starred item
 *
 * @param star The related Star model.
 */
export function useDragStar(
  star: Star
): [{ isDragging: boolean }, React.RefCallback<HTMLElement>] {
  const id = star.id;
  const { label: title, icon } = useSidebarLabelAndIcon(star);

  const [isDragging, dragRef] = useDragRef({
    type: "star",
    item: () => ({ id, title, icon }),
  });

  return [{ isDragging }, dragRef];
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

  return useDropRef<DragObject, { isOverCursor: boolean; isDragging: boolean }>(
    {
      accept,
      drop: async (item, monitor) => {
        // A more specific drop target (e.g. a reorder cursor) has already
        // handled this drop, so avoid creating a duplicate star.
        if (monitor.didDrop()) {
          return;
        }

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
        isOverCursor: !!monitor.isOver({ shallow: true }),
        isDragging: accept.includes(String(monitor.getItemType())),
      }),
    }
  );
}

/**
 * Hook for shared logic that allows dropping stars to reorder
 *
 * @param getIndex A function to get the index of the current item where the star should be inserted.
 */
export function useDropToReorderStar(getIndex?: () => string) {
  const { stars } = useStores();

  return useDropRef<DragObject, { isOverCursor: boolean; isDragging: boolean }>(
    {
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
    }
  );
}

/**
 * Hook for shared logic that allows dragging a sidebar section by its header.
 *
 * @param section The section to drag.
 * @param title The localized title of the section, shown in the drag preview.
 */
export function useDragSidebarSection(
  section: SidebarSection,
  title: string
): [{ isDragging: boolean }, React.RefCallback<HTMLElement>] {
  const [isDragging, dragRef] = useDragRef({
    type: "sidebarSection",
    item: () => ({ id: section, title }),
  });

  return [{ isDragging }, dragRef];
}

/**
 * Hook for shared logic that allows dropping a sidebar section to reorder it,
 * persisting the new order as a user preference.
 *
 * @param getNewOrder A function that returns the section order after dropping the given section here, or undefined when the drop would not change the order.
 */
export function useDropToReorderSidebarSection(
  getNewOrder: (section: SidebarSection) => SidebarSection[] | undefined
) {
  const user = useCurrentUser();

  return useDropRef<
    { id: SidebarSection; title: string },
    { isOverCursor: boolean; isDragging: boolean }
  >({
    accept: "sidebarSection",
    drop: (item) => {
      const order = getNewOrder(item.id);
      if (order) {
        user.setPreference(UserPreference.SidebarSectionOrder, order);
        void user.save();
      }
    },
    canDrop: (item) => !!getNewOrder(item.id),
    collect: (monitor) => ({
      isOverCursor: monitor.isOver() && monitor.canDrop(),
      isDragging: monitor.getItemType() === "sidebarSection",
    }),
  });
}

/**
 * Hook for shared logic that allows dragging documents.
 *
 * @param node The NavigationNode model to drag.
 * @param depth The depth of the node in the sidebar.
 * @param document The related Document model.
 * @param isEditing Whether the sidebar item is currently being edited.
 */
export function useDragDocument(
  node: NavigationNode,
  depth: number,
  document?: Document,
  isEditing?: boolean
) {
  const icon = document?.icon || node.icon || node.emoji;
  const color = document?.color || node.color;
  const initial = document?.initial || node.title;

  const [isDragging, dragRef] = useDragRef<DragObject>({
    type: "document",
    item: () =>
      ({
        ...node,
        depth,
        icon: icon ? (
          <Icon initial={initial} value={icon} color={color} />
        ) : undefined,
        collectionId: document?.collectionId || "",
      }) as DragObject,
    canDrag: () => !!document?.isActive && !isEditing,
  });

  return [{ isDragging }, dragRef] as const;
}

/**
 * Hook for shared logic that allows dropping documents on a collection to move
 * them to the top of it.
 *
 * @param collection The collection to move documents to.
 * @param expandNode A function to expand the collection.
 */
export function useDropToChangeCollection(
  collection: Collection,
  expandNode: () => void
) {
  const { t } = useTranslation();
  const { documents, collections, dialogs, policies } = useStores();
  const can = usePolicy(collection);
  const [startHover, cancelHover] = useHoverTimer(expandNode);

  const result = useDropRef<DragObject, { isOver: boolean; canDrop: boolean }>({
    accept: "document",
    drop: async (item, monitor) => {
      if (monitor.didDrop()) {
        return;
      }

      const { id, collectionId } = item;
      const prevCollection = collections.get(collectionId);
      const document = documents.get(id);

      if (
        prevCollection &&
        prevCollection.permission !== collection.permission &&
        !document?.isDraft
      ) {
        dialogs.openModal({
          title: t("Change permissions?"),
          content: (
            <ConfirmMoveDialog item={item} collection={collection} index={0} />
          ),
        });
      } else {
        try {
          await documents.move({
            documentId: id,
            collectionId: collection.id,
            index: 0,
          });
          expandNode();
        } catch (err) {
          if (err instanceof AuthorizationError) {
            toast.error(
              t(
                "You do not have permission to move {{ documentName }} to the {{ collectionName }} collection",
                {
                  documentName: item.title,
                  collectionName: collection.displayName,
                }
              )
            );
          } else {
            toast.error(errToString(err));
          }
        }
      }
    },
    canDrop: (item) => can.createDocument && !!policies.abilities(item.id).move,
    hover: (_, monitor) => {
      if (
        collection.hasDocuments &&
        monitor.canDrop() &&
        monitor.isOver({ shallow: true })
      ) {
        startHover();
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  const isOver = result[0].isOver;
  React.useEffect(() => {
    if (!isOver) {
      cancelHover();
    }
  }, [isOver, cancelHover]);

  return result;
}

/**
 * Hook for shared logic that allows dropping documents to reparent
 *
 * @param node The NavigationNode model to drop.
 * @param collection The collection that contains the node, if known.
 * @param setExpanded A function to expand the parent node.
 */
export function useDropToReparentDocument(
  node: NavigationNode | undefined,
  collection: Collection | undefined,
  setExpanded: () => void
) {
  const { t } = useTranslation();
  const { documents, collections, dialogs, policies } = useStores();
  const hasChildDocuments = !!node?.children.length;
  const document = node ? documents.get(node.id) : undefined;

  const [startHover, cancelHover] = useHoverTimer(setExpanded);

  const result = useDropRef<DragObject, { isOverReparent: boolean }>({
    accept: "document",
    drop: async (item, monitor) => {
      if (monitor.didDrop() || !node) {
        return;
      }

      const collectionId =
        node.collectionId ?? documents.get(node.id)?.collectionId;
      const targetCollection =
        collection ??
        (collectionId ? collections.get(collectionId) : undefined);
      const prevCollection = collections.get(item.collectionId);

      if (
        targetCollection &&
        prevCollection &&
        prevCollection.permission !== targetCollection.permission
      ) {
        dialogs.openModal({
          title: t("Change permissions?"),
          content: (
            <ConfirmMoveDialog
              item={item}
              collection={targetCollection}
              parentDocumentId={node.id}
            />
          ),
        });
      } else {
        try {
          await documents.move({
            documentId: item.id,
            parentDocumentId: node.id,
          });
          setExpanded();
        } catch (err) {
          if (err instanceof AuthorizationError) {
            toast.error(
              t(
                "{{ documentName }} cannot be moved within {{ parentDocumentName }}",
                {
                  documentName: item.title,
                  parentDocumentName: node.title,
                }
              )
            );
          } else {
            toast.error(errToString(err));
          }
        }
      }
    },
    canDrop: (item) => {
      if (!node || item.id === node.id || !policies.abilities(item.id).move) {
        return false;
      }

      if (!document) {
        return true; // optimistic, in case the document is not loaded yet; server will check for permissions before performing the move.
      }

      return (
        document.isActive &&
        !document.pathTo.some((ancestor) => ancestor.id === item.id)
      );
    },
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
        startHover();
      }
    },
    // Collected values must stay unchanged while the target is not hovered.
    // Collecting global drag state (e.g. a bare canDrop) re-renders every
    // sidebar row at drag start and drop.
    collect: (monitor) => ({
      isOverReparent: monitor.isOver({ shallow: true }) && monitor.canDrop(),
    }),
  });

  const isOverReparent = result[0].isOverReparent;
  React.useEffect(() => {
    if (!isOverReparent) {
      cancelHover();
    }
  }, [isOverReparent, cancelHover]);

  return result;
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
  const { documents, collections, dialogs, policies } = useStores();

  const document = documents.get(node.id);

  return useDropRef<DragObject, { isOverReorder: boolean }>({
    accept: "document",
    canDrop: (item: DragObject) => {
      if (
        (document && !document.isActive) ||
        !policies.abilities(item.id).move
      ) {
        return false;
      }
      if (item.id !== node.id) {
        return true;
      }
      // A document can only be dropped on its own cursor when that moves it to
      // a different parent, e.g. out of the end of an expanded subtree.
      const params = getMoveParams(item);
      return (
        !!params &&
        params.parentDocumentId !== item.id &&
        (params.parentDocumentId ?? null) !==
          (document?.parentDocumentId ?? null)
      );
    },
    drop: async (item) => {
      if (!collection?.isManualSort && item.collectionId === collection?.id) {
        toast.message(
          t(
            "You can’t reorder documents in an alphabetically sorted collection"
          )
        );
        return;
      }

      const params = getMoveParams(item);

      if (params) {
        const prevCollection = collections.get(item.collectionId);

        if (
          collection &&
          prevCollection &&
          prevCollection.permission !== collection.permission
        ) {
          dialogs.openModal({
            title: t("Change permissions?"),
            content: (
              <ConfirmMoveDialog
                item={item}
                collection={collection}
                {...params}
              />
            ),
          });
        } else {
          try {
            await documents.move(params);
          } catch (err) {
            if (err instanceof AuthorizationError) {
              toast.error(
                t("{{ documentName }} cannot be moved here", {
                  documentName: item.title,
                })
              );
            } else {
              toast.error(errToString(err));
            }
          }
        }
      }
    },
    // Collected values must stay unchanged while the target is not hovered.
    // Collecting global drag state (e.g. a bare canDrop) re-renders every
    // sidebar row at drag start and drop.
    collect: (monitor) => ({
      isOverReorder: monitor.isOver() && monitor.canDrop(),
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

  const [isDragging, dragRef] = useDragRef({
    type:
      membership instanceof UserMembership
        ? "userMembership"
        : "groupMembership",
    item: () => ({ id, title, icon }),
  });

  return [{ isDragging }, dragRef] as const;
}

/**
 * Hook for shared logic that allows dropping user memberships to reorder
 *
 * @param getIndex A function to get the index of the current item where the membership should be inserted.
 */
export function useDropToReorderUserMembership(getIndex?: () => string) {
  const { userMemberships } = useStores();
  const user = useCurrentUser();

  return useDropRef<DragObject, { isOverCursor: boolean; isDragging: boolean }>(
    {
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
    }
  );
}

/**
 * Hook for shared logic that allows dropping documents and collections onto archive section
 */
export function useDropToArchive() {
  const accept = ["document", "collection"];
  const { documents, collections, policies } = useStores();
  const { t } = useTranslation();

  return useDropRef<
    DragObject,
    { isOverArchiveSection: boolean; isDragging: boolean }
  >({
    accept,
    drop: async (item, monitor) => {
      const type = monitor.getItemType();
      let model;

      if (type === "collection") {
        model = collections.get(item.id);
      } else {
        model = documents.get(item.id);
      }

      if (model) {
        await model.archive();
        toast.success(
          type === "collection"
            ? t("Collection archived")
            : t("Document archived")
        );
      }
    },
    canDrop: (item) => policies.abilities(item.id).archive,
    collect: (monitor) => ({
      isOverArchiveSection: !!monitor.isOver(),
      isDragging: monitor.canDrop(),
    }),
  });
}

export function useDropToUnpublish() {
  const { t } = useTranslation();
  const { policies, documents } = useStores();

  return useDropRef<DragObject, { isOver: boolean; canDrop: boolean }>({
    accept: "document",
    drop: async (item) => {
      const document = documents.get(item.id);
      if (!document) {
        return;
      }

      try {
        await document.unpublish({ detach: true });
        toast.success(
          t("Unpublished {{ documentName }}", {
            documentName: document.noun,
          })
        );
      } catch (err) {
        toast.error(errToString(err));
      }
    },
    canDrop: (item) => {
      const policy = policies.abilities(item.id);
      if (!policy) {
        return true; // optimistic, let the server check for the necessary permission.
      }

      return policy.unpublish;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });
}
