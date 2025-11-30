import { observer } from "mobx-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavigationNode } from "@shared/types";
import Subheading from "~/components/Subheading";
import ReferenceListItem from "./ReferenceListItem";
import useShare from "@shared/hooks/useShare";

type Props = {
  documentId: string;
};

function PublicReferences(props: Props) {
  const { t } = useTranslation();
  const { sharedTree } = useShare();
  const { documentId } = props;

  // The sharedTree is the entire document tree starting at the shared document
  // we must filter down the tree to only the part with the document we're
  // currently viewing
  const children = useMemo(() => {
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
        <ReferenceListItem key={node.id} document={node} />
      ))}
    </>
  );
}

export default observer(PublicReferences);
