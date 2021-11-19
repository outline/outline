import * as React from "react";
import Breadcrumb from "~/components/Breadcrumb";
import { NavigationNode } from "~/types";

type Props = {
  documentId: string;
  shareId: string;
  sharedTree: NavigationNode | null | undefined;
  children?: React.ReactNode;
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'sharedTree' implicitly has an 'any' typ... Remove this comment to see the full error message
function pathToDocument(sharedTree, documentId) {
  // @ts-expect-error ts-migrate(7034) FIXME: Variable 'path' implicitly has type 'any[]' in som... Remove this comment to see the full error message
  let path = [];

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'nodes' implicitly has an 'any' type.
  const traveler = (nodes, previousPath) => {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'childNode' implicitly has an 'any' type... Remove this comment to see the full error message
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

  // @ts-expect-error ts-migrate(7005) FIXME: Variable 'path' implicitly has an 'any[]' type.
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
          return { ...item, to: `/share/${shareId}${item.url}` };
        }),
    [sharedTree, shareId, documentId]
  );

  return <Breadcrumb items={items} children={children} />;
};

export default PublicBreadcrumb;
