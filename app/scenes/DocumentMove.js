// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Document from "models/Document";
import DocumentPathList from "components/DocumentPathList";
import Flex from "components/Flex";
import Labeled from "components/Labeled";
import PathToDocument from "components/PathToDocument";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";

type Props = {|
  document: Document,
  onRequestClose: () => void,
|};

function DocumentMove({ document, onRequestClose }: Props) {
  const { collections } = useStores();
  const { showToast } = useToasts();
  const { t } = useTranslation();

  const handleMove = async (selectedPath) => {
    if (!document) return;

    if (!selectedPath) {
      showToast(t("Please select a path"));
      return;
    }

    if (selectedPath.type === "document") {
      await document.move(selectedPath.collectionId, selectedPath.id);
    } else {
      await document.move(selectedPath.collectionId, null);
    }

    showToast(t("Document moved"), { type: "info" });
    onRequestClose();
  };

  const renderPathToCurrentDocument = () => {
    const result = collections.getPathForDocument(document.id);

    if (result) {
      return (
        <PathToDocument
          result={result}
          collection={collections.get(result.collectionId)}
        />
      );
    }
  };

  if (!document || !collections.isLoaded) {
    return null;
  }

  return (
    <Flex column>
      <Section>
        <Labeled label={t("Current location")}>
          {renderPathToCurrentDocument()}
        </Labeled>
      </Section>
      <Section column>
        <Labeled label={t("Choose a new location")} />
        <NewLocation>
          <DocumentPathList
            document={document}
            handleSelect={handleMove}
            selectName={t("Move")}
          />
        </NewLocation>
      </Section>
    </Flex>
  );
}

const NewLocation = styled(Flex)`
  display: block;
  flex: initial;
  height: 40vh;
`;

const Section = styled(Flex)`
  margin-bottom: 24px;
`;

export default observer(DocumentMove);
