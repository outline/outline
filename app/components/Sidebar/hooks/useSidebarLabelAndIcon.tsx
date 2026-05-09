import { DocumentIcon, QuestionMarkIcon } from "outline-icons";
import * as React from "react";
import Icon from "@shared/components/Icon";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import useStores from "~/hooks/useStores";

interface SidebarItem {
  documentId?: string;
  collectionId?: string;
  groupId?: string;
}

export function useSidebarLabelAndIcon({
  documentId,
  collectionId,
  groupId,
}: SidebarItem) {
  const { collections, documents } = useStores();
  const icon = <QuestionMarkIcon />;

  if (documentId) {
    const document = documents.get(documentId);
    if (document) {
      return {
        label: document.titleWithDefault,
        icon: document.icon ? (
          <Icon
            value={document.icon}
            initial={document.initial}
            color={document.color ?? undefined}
          />
        ) : groupId ? null : (
          <DocumentIcon outline={document.isDraft} />
        ),
      };
    }
  }

  if (collectionId) {
    const collection = collections.get(collectionId);
    if (collection) {
      return {
        label: collection.name,
        icon: <CollectionIcon collection={collection} />,
      };
    }
  }

  return {
    label: "",
    icon,
  };
}
