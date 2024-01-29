import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { NavigationNode } from "@shared/types";
import Subheading from "~/components/Subheading";
import ReferenceListItem from "./ReferenceListItem";

type Props = {
  shareId: string;
  documentId: string;
  sharedTree?: NavigationNode;
};

function PublicReferences(props: Props) {
  const { t } = useTranslation();
  const { shareId, documentId, sharedTree } = props;

  // The sharedTree is the entire document tree starting at the shared document
  // we must filter down the tree to only the part with the document we're
  // currently viewing
  const children = React.useMemo(() => {
    let result: NavigationNode[];

    function findChildren(node?: NavigationNode) {
      if (!node) {
        return;
      }

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

    return findChildren(sharedTree) || [];
  }, [documentId, sharedTree]);

  if (!children.length) {
    return null;
  }

  return (
    <>
      <Subheading>{t("Documents")}</Subheading>
      {children.map((node) => (
        <ReferenceListItem key={node.id} document={node} shareId={shareId} />
      ))}
    </>
  );
}

export default observer(PublicReferences);
