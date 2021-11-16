import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Subheading from "components/Subheading";
import ReferenceListItem from "./ReferenceListItem";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'types' or its corresponding ty... Remove this comment to see the full error message
import { NavigationNode } from "types";
import "types";

type Props = {
  shareId: string;
  documentId: string;
  sharedTree: NavigationNode;
};

function PublicReferences(props: Props) {
  const { t } = useTranslation();
  const { shareId, documentId, sharedTree } = props;
  // The sharedTree is the entire document tree starting at the shared document
  // we must filter down the tree to only the part with the document we're
  // currently viewing
  const children = React.useMemo(() => {
    // @ts-expect-error ts-migrate(7034) FIXME: Variable 'result' implicitly has type 'any' in som... Remove this comment to see the full error message
    let result;

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'node' implicitly has an 'any' type.
    function findChildren(node) {
      if (!node) return;

      if (node.id === documentId) {
        result = node.children;
      } else {
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'node' implicitly has an 'any' type.
        node.children.forEach((node) => {
          // @ts-expect-error ts-migrate(7005) FIXME: Variable 'result' implicitly has an 'any' type.
          if (result) {
            return;
          }

          findChildren(node);
        });
      }

      // @ts-expect-error ts-migrate(7005) FIXME: Variable 'result' implicitly has an 'any' type.
      return result;
    }

    return findChildren(sharedTree) || [];
  }, [documentId, sharedTree]);

  if (!children.length) {
    return null;
  }

  return (
    <>
      <Subheading>{t("Nested documents")}</Subheading>
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'node' implicitly
      has an 'any' type.
      {children.map((node) => (
        <ReferenceListItem key={node.id} document={node} shareId={shareId} />
      ))}
    </>
  );
}

export default observer(PublicReferences);
