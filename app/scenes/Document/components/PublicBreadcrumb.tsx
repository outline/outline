import * as React from "react";
import { NavigationNode } from "@shared/types";
import Breadcrumb from "~/components/Breadcrumb";
import Icon from "~/components/Icon";
import { MenuInternalLink } from "~/types";
import { sharedDocumentPath } from "~/utils/routeHelpers";

type Props = {
  children?: React.ReactNode;
  documentId: string;
  shareId: string;
  sharedTree: NavigationNode | undefined;
};

function pathToDocument(
  sharedTree: NavigationNode | undefined,
  documentId: string
) {
  let path: NavigationNode[] = [];

  const traveler = (
    nodes: NavigationNode[],
    previousPath: NavigationNode[]
  ) => {
    nodes.forEach((childNode) => {
      const newPath = [...previousPath, childNode];

      if (childNode.id === documentId) {
        path = newPath;
        return;
      }

      return traveler(childNode.children, newPath);
    });
  };

  if (sharedTree) {
    traveler([sharedTree], []);
  }

  return path;
}

const PublicBreadcrumb: React.FC<Props> = ({
  documentId,
  shareId,
  sharedTree,
  children,
}: Props) => {
  const items: MenuInternalLink[] = React.useMemo(
    () =>
      pathToDocument(sharedTree, documentId)
        .slice(0, -1)
        .map((item) => ({
          ...item,
          icon: item.icon ? (
            <Icon value={item.icon} color={item.color} />
          ) : undefined,
          title: item.title,
          type: "route",
          to: sharedDocumentPath(shareId, item.url),
        })),
    [sharedTree, shareId, documentId]
  );

  return <Breadcrumb items={items}>{children}</Breadcrumb>;
};

export default PublicBreadcrumb;
