import { observer } from "mobx-react";
import {
  ArchiveIcon,
  EditIcon,
  GoToIcon,
  ShapesIcon,
  TrashIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Document from "~/models/Document";
import Breadcrumb, { Crumb } from "~/components/Breadcrumb";
import CollectionIcon from "~/components/CollectionIcon";
import useStores from "~/hooks/useStores";
import { NavigationNode } from "~/types";
import { collectionUrl } from "~/utils/routeHelpers";

type Props = {
  document: Document;
  children?: React.ReactNode;
  onlyText?: boolean;
};

function useCategory(document: Document) {
  const { t } = useTranslation();

  if (document.isDeleted) {
    return {
      icon: <TrashIcon color="currentColor" />,
      title: t("Trash"),
      to: "/trash",
    };
  }

  if (document.isArchived) {
    return {
      icon: <ArchiveIcon color="currentColor" />,
      title: t("Archive"),
      to: "/archive",
    };
  }

  if (document.isDraft) {
    return {
      icon: <EditIcon color="currentColor" />,
      title: t("Drafts"),
      to: "/drafts",
    };
  }

  if (document.isTemplate) {
    return {
      icon: <ShapesIcon color="currentColor" />,
      title: t("Templates"),
      to: "/templates",
    };
  }

  return null;
}

const DocumentBreadcrumb = ({ document, children, onlyText }: Props) => {
  const { collections } = useStores();
  const { t } = useTranslation();
  const category = useCategory(document);
  const collection = collections.get(document.collectionId);

  let collectionNode: Crumb;

  if (collection) {
    collectionNode = {
      title: collection.name,
      icon: <CollectionIcon collection={collection} expanded />,
      to: collectionUrl(collection.url),
    };
  } else {
    collectionNode = {
      title: t("Deleted Collection"),
      icon: undefined,
      to: collectionUrl("deleted-collection"),
    };
  }

  const path = React.useMemo(
    () => collection?.pathToDocument?.(document.id).slice(0, -1) || [],
    [collection, document.id]
  );

  const items = React.useMemo(() => {
    const output: Crumb[] = [];

    if (category) {
      output.push(category);
    }

    output.push(collectionNode);

    path.forEach((p: NavigationNode) => {
      output.push({
        title: p.title,
        to: p.url,
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
        {path.map((n: any) => (
          <React.Fragment key={n.id}>
            <SmallSlash />
            {n.title}
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
