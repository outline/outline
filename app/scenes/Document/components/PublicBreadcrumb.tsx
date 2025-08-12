import * as React from "react";
import Icon from "@shared/components/Icon";
import { NavigationNode } from "@shared/types";
import Breadcrumb from "~/components/Breadcrumb";
import { sharedModelPath } from "~/utils/routeHelpers";
import { createInternalLinkActionV2 } from "~/actions";
import { ActiveDocumentSection } from "~/actions/sections";

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
  const actions = React.useMemo(
    () =>
      pathToDocument(sharedTree, documentId)
        .slice(1, -1)
        .map((item) =>
          createInternalLinkActionV2({
            name: item.title,
            section: ActiveDocumentSection,
            icon: item.icon ? (
              <Icon value={item.icon} color={item.color} />
            ) : undefined,
            to: sharedModelPath(shareId, item.url),
          })
        ),
    [sharedTree, shareId, documentId]
  );

  return <Breadcrumb actions={actions}>{children}</Breadcrumb>;
};

export default PublicBreadcrumb;
