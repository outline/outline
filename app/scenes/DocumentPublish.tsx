import flatten from "lodash/flatten";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { ellipsis } from "@shared/styles";
import { NavigationNode } from "@shared/types";
import Document from "~/models/Document";
import Button from "~/components/Button";
import DocumentExplorer from "~/components/DocumentExplorer";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useCollectionTrees from "~/hooks/useCollectionTrees";
import useStores from "~/hooks/useStores";
import { flattenTree } from "~/utils/tree";

type Props = {
  /** Document to publish */
  document: Document;
};

function DocumentPublish({ document }: Props) {
  const { dialogs, policies } = useStores();
  const { t } = useTranslation();
  const collectionTrees = useCollectionTrees();
  const [selectedPath, selectPath] = React.useState<NavigationNode | null>(
    null
  );
  const publishOptions = React.useMemo(
    () =>
      flatten(collectionTrees.map(flattenTree)).filter((node) =>
        node.collectionId
          ? policies.get(node.collectionId)?.abilities.createDocument
          : true
      ),
    [policies, collectionTrees]
  );

  const publish = async () => {
    if (!selectedPath) {
      toast.message(t("Select a location to publish"));
      return;
    }

    try {
      const { type, id: parentDocumentId } = selectedPath;

      const collectionId = selectedPath.collectionId as string;

      // Also move it under if selected path corresponds to another doc
      if (type === "document") {
        await document.move({ collectionId, parentDocumentId });
      }

      document.collectionId = collectionId;
      await document.save(undefined, { publish: true });

      toast.success(t("Document published"));

      dialogs.closeAllModals();
    } catch (err) {
      toast.error(t("Couldn’t publish the document, try again?"));
    }
  };

  return (
    <FlexContainer column>
      <DocumentExplorer
        items={publishOptions}
        onSubmit={publish}
        onSelect={selectPath}
      />
      <Footer justify="space-between" align="center" gap={8}>
        <StyledText type="secondary">
          {selectedPath ? (
            <Trans
              defaults="Publish in <em>{{ location }}</em>"
              values={{
                location: selectedPath.title,
              }}
              components={{
                em: <strong />,
              }}
            />
          ) : (
            t("Select a location to publish")
          )}
        </StyledText>
        <Button disabled={!selectedPath} onClick={publish}>
          {t("Publish")}
        </Button>
      </Footer>
    </FlexContainer>
  );
}

const FlexContainer = styled(Flex)`
  margin-left: -24px;
  margin-right: -24px;
  margin-bottom: -24px;
  outline: none;
`;

const Footer = styled(Flex)`
  height: 64px;
  border-top: 1px solid ${(props) => props.theme.horizontalRule};
  padding-left: 24px;
  padding-right: 24px;
`;

const StyledText = styled(Text)`
  ${ellipsis()}
  margin-bottom: 0;
`;

export default observer(DocumentPublish);
