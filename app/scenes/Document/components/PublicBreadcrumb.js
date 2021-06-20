// @flow
import * as React from "react";
import Breadcrumb from "components/Breadcrumb";
import type { NavigationNode } from "types";

type Props = {|
  documentId: string,
  shareId: string,
  sharedTree: ?NavigationNode,
  children?: React.Node,
|};

function pathToDocument(sharedTree, documentId) {
  let path = [];
  const traveler = (nodes, previousPath) => {
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

const PublicBreadcrumb = ({
  documentId,
  shareId,
  sharedTree,
  children,
}: Props) => {
  const items = React.useMemo(
    () =>
      pathToDocument(sharedTree, documentId)
        .slice(0, -1)
        .map((item) => {
          return {
            ...item,
            to: `/share/${shareId}${item.url}`,
          };
        }),
    [sharedTree, shareId, documentId]
  );

  return <Breadcrumb items={items} children={children} />;
};

export default PublicBreadcrumb;
