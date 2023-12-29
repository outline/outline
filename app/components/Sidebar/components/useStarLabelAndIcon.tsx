import { StarredIcon } from "outline-icons";
import * as React from "react";
import { useTheme } from "styled-components";
import Star from "~/models/Star";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import EmojiIcon from "~/components/Icons/EmojiIcon";
import useStores from "~/hooks/useStores";

export function useStarLabelAndIcon({ documentId, collectionId }: Star) {
  const { collections, documents } = useStores();
  const theme = useTheme();

  if (documentId) {
    const document = documents.get(documentId);
    if (document) {
      return {
        label: document.titleWithDefault,
        icon: document.emoji ? (
          <EmojiIcon emoji={document.emoji} />
        ) : (
          <StarredIcon color={theme.yellow} />
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
    icon: <StarredIcon color={theme.yellow} />,
  };
}
