import * as React from "react";
import Breadcrumb from "~/components/Breadcrumb";
import { MenuInternalLink, NavigationNode } from "~/types";

type Props = {
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
}) => {
  const items: MenuInternalLink[] = React.useMemo(
    () =>
      pathToDocument(sharedTree, documentId)
        .slice(0, -1)
        .map((item) => {
          return { ...item, type: "route", to: `/share/${shareId}${item.url}` };
        }),
    [sharedTree, shareId, documentId]
  );

  return <Breadcrumb items={items} children={children} />;
};

export default PublicBreadcrumb;
