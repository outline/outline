import { observer } from "mobx-react";
import { ArchiveIcon, GoToIcon, ShapesIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Document from "~/models/Document";
import Breadcrumb from "~/components/Breadcrumb";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import useStores from "~/hooks/useStores";
import { MenuInternalLink, NavigationNode } from "~/types";
import { collectionUrl } from "~/utils/routeHelpers";

type Props = {
  document: Document;
  onlyText?: boolean;
};

function useCategory(document: Document): MenuInternalLink | null {
  const { t } = useTranslation();

  if (document.isDeleted) {
    return {
      type: "route",
      icon: <TrashIcon color="currentColor" />,
      title: t("Trash"),
      to: "/trash",
    };
  }

  if (document.isArchived) {
    return {
      type: "route",
      icon: <ArchiveIcon color="currentColor" />,
      title: t("Archive"),
      to: "/archive",
    };
  }

  if (document.isTemplate) {
    return {
      type: "route",
      icon: <ShapesIcon color="currentColor" />,
      title: t("Templates"),
      to: "/templates",
    };
  }

  return null;
}

const DocumentBreadcrumb: React.FC<Props> = ({
  document,
  children,
  onlyText,
}) => {
  const { collections } = useStores();
  const { t } = useTranslation();
  const category = useCategory(document);
  const collection = collections.get(document.collectionId);

  let collectionNode: MenuInternalLink | undefined;

  if (collection) {
    collectionNode = {
      type: "route",
      title: collection.name,
      icon: <CollectionIcon collection={collection} expanded />,
      to: collectionUrl(collection.url),
    };
  } else if (document.collectionId && !collection) {
    collectionNode = {
      type: "route",
      title: t("Deleted Collection"),
      icon: undefined,
      to: collectionUrl("deleted-collection"),
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

  return <Breadcrumb items={items} children={children} highlightFirstItem />;
};

const SmallSlash = styled(GoToIcon)`
  width: 12px;
  height: 12px;
  vertical-align: middle;
  flex-shrink: 0;

  fill: ${(props) => props.theme.slate};
  opacity: 0.5;
`;

export default observer(DocumentBreadcrumb);
