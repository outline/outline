import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import { NavigationNode } from "@shared/types";
import Document from "~/models/Document";
import Button from "~/components/Button";
import DocumentExplorer from "~/components/DocumentExplorer";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type Props = {
  /** Document to publish */
  document: Document;
};

function DocumentPublish({ document }: Props) {
  const { dialogs } = useStores();
  const { showToast } = useToasts();
  const { t } = useTranslation();

  const [selectedPath, selectPath] = React.useState<NavigationNode | null>(
    null
  );

  const publish = async () => {
    if (!selectedPath) {
      showToast(t("Select a location to publish"), {
        type: "info",
      });
      return;
    }

    try {
      const { type, id: parentDocumentId } = selectedPath;

      const collectionId = selectedPath.collectionId as string;

      // Also move it under if selected path corresponds to another doc
      if (type === "document") {
        await document.move(collectionId, parentDocumentId);
      }

      document.collectionId = collectionId;
      await document.save({ publish: true });

      showToast(t("Document published"), {
        type: "success",
      });

      dialogs.closeAllModals();
    } catch (err) {
      showToast(t("Couldn’t publish the document, try again?"), {
        type: "error",
      });
    }
  };

  return (
    <FlexContainer column>
      <DocumentExplorer onSubmit={publish} onSelect={selectPath} />
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0;
`;

export default observer(DocumentPublish);
