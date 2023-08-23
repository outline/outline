import { observer } from "mobx-react";
import { ArchiveIcon, GoToIcon, ShapesIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type { NavigationNode } from "@shared/types";
import Document from "~/models/Document";
import Breadcrumb from "~/components/Breadcrumb";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import useStores from "~/hooks/useStores";
import { MenuInternalLink } from "~/types";
import {
  archivePath,
  collectionPath,
  templatesPath,
  trashPath,
} from "~/utils/routeHelpers";

type Props = {
  children?: React.ReactNode;
  document: Document;
  onlyText?: boolean;
};

function useCategory(document: Document): MenuInternalLink | null {
  const { t } = useTranslation();

  if (document.isDeleted) {
    return {
      type: "route",
      icon: <TrashIcon />,
      title: t("Trash"),
      to: trashPath(),
    };
  }

  if (document.isArchived) {
    return {
      type: "route",
      icon: <ArchiveIcon />,
      title: t("Archive"),
      to: archivePath(),
    };
  }

  if (document.isTemplate) {
    return {
      type: "route",
      icon: <ShapesIcon />,
      title: t("Templates"),
      to: templatesPath(),
    };
  }

  return null;
}

const DocumentBreadcrumb: React.FC<Props> = ({
  document,
  children,
  onlyText,
}: Props) => {
  const { collections } = useStores();
  const { t } = useTranslation();
  const category = useCategory(document);
  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;

  let collectionNode: MenuInternalLink | undefined;

  if (collection) {
    collectionNode = {
      type: "route",
      title: collection.name,
      icon: <CollectionIcon collection={collection} expanded />,
      to: collectionPath(collection.url),
    };
  } else if (document.collectionId && !collection) {
    collectionNode = {
      type: "route",
      title: t("Deleted Collection"),
      icon: undefined,
      to: collectionPath("deleted-collection"),
    };
  }

  const path = React.useMemo(
    () => collection?.pathToDocument(document.id).slice(0, -1) || [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collection, document, document.collectionId, document.parentDocumentId]
  );

  const items = React.useMemo(() => {
    const output = [];

    if (category) {
      output.push(category);
    }

    if (collectionNode) {
      output.push(collectionNode);
    }

    path.forEach((node: NavigationNode) => {
      output.push({
        type: "route",
        title: node.title,
        to: node.url,
      });
    });
    return output;
  }, [path, category, collectionNode]);

  if (!collections.isLoaded) {
    return null;
  }

  if (onlyText === true) {
    return (
      <>
        {collection?.name}
        {path.map((node: NavigationNode) => (
          <React.Fragment key={node.id}>
            <SmallSlash />
            {node.title}
          </React.Fragment>
        ))}
      </>
    );
  }

  return (
    <Breadcrumb items={items} highlightFirstItem>
      {children}
    </Breadcrumb>
  );
};

const SmallSlash = styled(GoToIcon)`
  width: 12px;
  height: 12px;
  vertical-align: middle;
  flex-shrink: 0;

  fill: ${(props) => props.theme.textTertiary};
  opacity: 0.5;
`;

export default observer(DocumentBreadcrumb);
