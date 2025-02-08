import { observer } from "mobx-react";
import { ArchiveIcon, GoToIcon, ShapesIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import type { NavigationNode } from "@shared/types";
import Document from "~/models/Document";
import Breadcrumb from "~/components/Breadcrumb";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { MenuInternalLink } from "~/types";
import { archivePath, settingsPath, trashPath } from "~/utils/routeHelpers";

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

  if (document.template) {
    return {
      type: "route",
      icon: <ShapesIcon />,
      title: t("Templates"),
      to: settingsPath("templates"),
    };
  }

  return null;
}

function DocumentBreadcrumb(
  { document, children, onlyText }: Props,
  ref: React.RefObject<HTMLDivElement> | null
) {
  const { collections } = useStores();
  const { t } = useTranslation();
  const category = useCategory(document);
  const sidebarContext = useLocationSidebarContext();
  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const can = usePolicy(collection);

  React.useEffect(() => {
    void document.loadRelations({ withoutPolicies: true });
  }, [document]);

  let collectionNode: MenuInternalLink | undefined;

  if (collection && can.readDocument) {
    collectionNode = {
      type: "route",
      title: collection.name,
      icon: <CollectionIcon collection={collection} expanded />,
      to: {
        pathname: collection.path,
        state: { sidebarContext },
      },
    };
  } else if (document.isCollectionDeleted) {
    collectionNode = {
      type: "route",
      title: t("Deleted Collection"),
      icon: undefined,
      to: "",
    };
  }

  const path = document.pathTo;

  const items = React.useMemo(() => {
    const output = [];

    if (category) {
      output.push(category);
    }

    if (collectionNode) {
      output.push(collectionNode);
    }

    path.slice(0, -1).forEach((node: NavigationNode) => {
      const title = node.title || t("Untitled");
      output.push({
        type: "route",
        title: node.icon ? (
          <>
            <StyledIcon value={node.icon} color={node.color} /> {title}
          </>
        ) : (
          title
        ),
        to: {
          pathname: node.url,
          state: { sidebarContext },
        },
      });
    });
    return output;
  }, [t, path, category, sidebarContext, collectionNode]);

  if (!collections.isLoaded) {
    return null;
  }

  if (onlyText === true) {
    return (
      <>
        {collection?.name}
        {path.slice(0, -1).map((node: NavigationNode) => (
          <React.Fragment key={node.id}>
            <SmallSlash />
            {node.title || t("Untitled")}
          </React.Fragment>
        ))}
      </>
    );
  }

  return (
    <Breadcrumb items={items} ref={ref} highlightFirstItem>
      {children}
    </Breadcrumb>
  );
}

const StyledIcon = styled(Icon)`
  margin-right: 2px;
`;

const SmallSlash = styled(GoToIcon)`
  width: 12px;
  height: 12px;
  vertical-align: middle;
  flex-shrink: 0;

  fill: ${(props) => props.theme.textTertiary};
  opacity: 0.5;
`;

export default observer(React.forwardRef(DocumentBreadcrumb));
