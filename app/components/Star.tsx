import { observer } from "mobx-react";
import { StarredIcon, UnstarredIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components";
import { hover } from "@shared/styles";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import {
  starCollection,
  unstarCollection,
} from "~/actions/definitions/collections";
import { starDocument, unstarDocument } from "~/actions/definitions/documents";
import useActionContext from "~/hooks/useActionContext";
import NudeButton from "./NudeButton";

type Props = {
  /** Target collection */
  collection?: Collection;
  /** Target document */
  document?: Document;
  /** Size of the star */
  size?: number;
  /** Color override for the star */
  color?: string;
};

function Star({ size, document, collection, color, ...rest }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const context = useActionContext({
    activeDocumentId: document?.id,
    activeCollectionId: collection?.id,
  });

  const target = document || collection;

  if (!target) {
    return null;
  }

  return (
    <NudeButton
      context={context}
      hideOnActionDisabled
      tooltip={{
        content: target.isStarred ? t("Unstar document") : t("Star document"),
        delay: 500,
      }}
      action={
        collection
          ? collection.isStarred
            ? unstarCollection
            : starCollection
          : document
          ? document.isStarred
            ? unstarDocument
            : starDocument
          : undefined
      }
      size={size}
      {...rest}
    >
      {target.isStarred ? (
        <AnimatedStar size={size} color={theme.yellow} />
      ) : (
        <AnimatedStar
          size={size}
          color={color ?? theme.textTertiary}
          as={UnstarredIcon}
        />
      )}
    </NudeButton>
  );
}

export const AnimatedStar = styled(StarredIcon)`
  flex-shrink: 0;
  transition: all 100ms ease-in-out;

  &: ${hover} {
    transform: scale(1.1);
  }
  &:active {
    transform: scale(0.95);
  }

  @media print {
    display: none;
  }
`;

export default observer(Star);
