// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import styled from "styled-components";
import Document from "models/Document";
import Button from "components/Button";
import Flex from "components/Flex";
import { Outline } from "components/Input";
import Labeled from "components/Labeled";
import PathToDocument from "components/PathToDocument";
import useListDocumentPath from "hooks/useListDocumentPath";
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

  const { row, results, setSearchTerm, selectedPath } = useListDocumentPath(
    document
  );

  const handleMove = async () => {
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

  const handleFilter = (ev: SyntheticInputEvent<*>) => {
    setSearchTerm(ev.target.value);
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

  const data = results;

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
          <InputWrapper>
            <Input
              type="search"
              placeholder={`${t("Search collections & documents")}…`}
              onChange={handleFilter}
              required
              autoFocus
            />
          </InputWrapper>
          <Results>
            <AutoSizer>
              {({ width, height }) => (
                <Flex role="listbox" column>
                  <List
                    key={data.length}
                    width={width}
                    height={height}
                    itemData={data}
                    itemCount={data.length}
                    itemSize={40}
                    itemKey={(index, data) => data[index].id}
                  >
                    {row}
                  </List>
                </Flex>
              )}
            </AutoSizer>
          </Results>
        </NewLocation>
        <Flex justify="flex-end">
          <Button onClick={handleMove} disabled={!selectedPath}>
            <Trans>Move</Trans>
          </Button>
        </Flex>
      </Section>
    </Flex>
  );
}

const InputWrapper = styled("div")`
  padding: 8px;
  width: 100%;
`;

const Input = styled("input")`
  width: 100%;
  outline: none;
  background: none;
  border-radius: 4px;
  height: 30px;
  border: 0;
  color: ${(props) => props.theme.text};

  &::placeholder {
    color: ${(props) => props.theme.placeholder};
  }
`;

const NewLocation = styled(Outline)`
  display: block;
  flex: initial;
  height: 40vh;
`;

const Results = styled.div`
  padding: 8px 0;
  height: calc(100% - 46px);
`;

const Section = styled(Flex)`
  margin-bottom: 24px;
`;

export default observer(DocumentMove);
