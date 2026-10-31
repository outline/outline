import { QuestionMarkIcon } from "outline-icons";
import * as React from "react";
import Icon from "@shared/components/Icon";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import useStores from "~/hooks/useStores";
import { DocumentIcon } from "~/components/Icons/DocumentIcon";

interface SidebarItem {
  documentId?: string;
  collectionId?: string;
  groupId?: string;
}

/**
 * Returns the label and icon for a sidebar item that references a document or
 * collection. The result is memoized so that rows receive equal props between
 * renders.
 *
 * @param item the ids of the document, collection, or group of the item.
 * @returns the label and icon of the item.
 */
export function useSidebarLabelAndIcon({
  documentId,
  collectionId,
  groupId,
}: SidebarItem) {
  const { collections, documents } = useStores();
  const document = documentId ? documents.get(documentId) : undefined;
  const collection =
    !document && collectionId ? collections.get(collectionId) : undefined;

  const title = document?.displayTitle;
  const documentIcon = document?.icon;
  const initial = document?.initial;
  const color = document?.color;
  const isEmpty = document?.isEmpty;
  const collectionName = collection?.displayName;

  return React.useMemo(() => {
    if (document) {
      return {
        label: title ?? "",
        icon: documentIcon ? (
          <Icon
            value={documentIcon}
            initial={initial ?? ""}
            color={color ?? undefined}
          />
        ) : groupId ? null : (
          <DocumentIcon empty={isEmpty} />
        ),
      };
    }

    if (collection) {
      return {
        label: collectionName ?? "",
        icon: <CollectionIcon collection={collection} />,
      };
    }

    return {
      label: "",
      icon: <QuestionMarkIcon />,
    };
  }, [
    document,
    title,
    documentIcon,
    initial,
    color,
    isEmpty,
    groupId,
    collection,
    collectionName,
  ]);
}
