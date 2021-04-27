// @flow
import { observer } from "mobx-react";
import * as React from "react";
import Tab from "components/Tab";
import Tabs from "components/Tabs";
import ReferenceListItem from "./ReferenceListItem";

type Props = {|
  shareId: string,
  documentId: string,
  documentTree: NavigatioNode,
|};

function PublicReferences(props: Props) {
  const { shareId, documentId, documentTree } = props;
  let result;

  function findChildren(node) {
    if (!node) return;
    if (node.id === documentId) {
      result = node.children;
    } else {
      node.children.forEach((node) => {
        if (result) {
          return;
        }
        findChildren(node);
      });
    }
    return result;
  }

  const children = findChildren(documentTree) || [];
  const showNestedDocuments = !!children.length;

  return (
    showNestedDocuments && (
      <>
        <Tabs>
          <Tab to="#children">Nested documents</Tab>
        </Tabs>
        {children.map((node) => (
          <ReferenceListItem key={node.id} document={node} shareId={shareId} />
        ))}
      </>
    )
  );
}

export default observer(PublicReferences);
