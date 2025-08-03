import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import Icon from "@shared/components/Icon";
import { NavigationNode } from "@shared/types";
import useStores from "~/hooks/useStores";
import { sharedModelPath } from "~/utils/routeHelpers";
import { SharedDocumentLink } from "./SharedDocumentLink";
import SidebarLink from "./SidebarLink";

type Props = {
  node: NavigationNode;
  shareId: string;
};

function CollectionLink({ node, shareId }: Props) {
  const { t } = useTranslation();
  const { documents, ui } = useStores();

  const icon = node.icon ?? node.emoji;

  return (
    <>
      <SidebarLink
        to={{
          pathname: sharedModelPath(shareId),
          state: {
            title: node.title,
          },
        }}
        icon={icon && <Icon value={icon} color={node.color} />}
        label={node.title || t("Untitled")}
        depth={0}
        exact={false}
        scrollIntoViewIfNeeded={true}
        isActive={() => ui.activeCollectionId === node.id}
      />
      {node.children.map((childNode, index) => (
        <SharedDocumentLink
          key={childNode.id}
          index={index}
          depth={2}
          shareId={shareId}
          node={childNode}
          prefetchDocument={documents.prefetchDocument}
          activeDocumentId={ui.activeDocumentId}
          activeDocument={documents.active}
        />
      ))}
    </>
  );
}

export const SharedCollectionLink = observer(CollectionLink);
