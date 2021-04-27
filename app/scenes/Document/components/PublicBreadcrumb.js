// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { Crumb, Slash } from "components/Breadcrumb";
import Flex from "components/Flex";
import BreadcrumbMenu from "menus/BreadcrumbMenu";
import { type NavigationNode } from "types";

type Props = {|
  documentId: string,
  shareId: string,
  sharedTree: NavigationNode,
  children?: React.Node,
|};

function pathToDocument(sharedTree: NavigationNode, documentId: string) {
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
  const path = React.useMemo(
    () =>
      pathToDocument(sharedTree, documentId)
        .slice(0, -1)
        .map((item) => {
          return {
            ...item,
            url: `/share/${shareId}${item.url}`,
          };
        }),
    [sharedTree, shareId, documentId]
  );
  const isNestedDocument = path.length > 2;
  const firstPath = path[0];
  const lastPath = path.length ? path[path.length - 1] : undefined;
  const menuPath = isNestedDocument ? path.slice(1, -1) : [];

  return (
    <Flex justify="flex-start" align="center">
      {firstPath && (
        <Crumb to={firstPath.url} title={firstPath.title}>
          {firstPath.title}
        </Crumb>
      )}
      {isNestedDocument && (
        <>
          <Slash /> <BreadcrumbMenu path={menuPath} />
        </>
      )}
      {lastPath && firstPath !== lastPath && (
        <>
          <Slash />{" "}
          <Crumb to={lastPath.url} title={lastPath.title}>
            {lastPath.title}
          </Crumb>
        </>
      )}
      {!!path.length && <Slash />}
      {children}
    </Flex>
  );
};

export default observer(PublicBreadcrumb);
