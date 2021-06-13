// @flow
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
import Document from "models/Document";
import Breadcrumb from "components/Breadcrumb";
import CollectionIcon from "components/CollectionIcon";
import useStores from "hooks/useStores";
import { collectionUrl } from "utils/routeHelpers";

type Props = {|
  document: Document,
  children?: React.Node,
  onlyText: boolean,
|};

function useCategory(document) {
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

  let collection = collections.get(document.collectionId);
  if (!collection) {
    collection = {
      id: document.collectionId,
      name: t("Deleted Collection"),
      color: "currentColor",
      url: "deleted-collection",
    };
  }

  const path = React.useMemo(
    () =>
      collection && collection.pathToDocument
        ? collection.pathToDocument(document.id).slice(0, -1)
        : [],
    [collection, document.id]
  );

  const items = React.useMemo(() => {
    let output = [];

    if (category) {
      output.push(category);
    }

    if (collection) {
      output.push({
        icon: <CollectionIcon collection={collection} expanded />,
        title: collection.name,
        to: collectionUrl(collection.url),
      });
    }

    path.forEach((p) => {
      output.push({
        title: p.title,
        to: p.url,
      });
    });

    return output;
  }, [path, category, collection]);

  if (!collections.isLoaded) {
    return null;
  }

  if (onlyText === true) {
    return (
      <>
        {collection.name}
        {path.map((n) => (
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
