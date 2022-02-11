import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import styled from "styled-components";
import { DocumentPath } from "~/stores/CollectionsStore";
import Document from "~/models/Document";
import Flex from "~/components/Flex";
import { Outline } from "~/components/Input";
import Labeled from "~/components/Labeled";
import PathToDocument from "~/components/PathToDocument";
import useSearchDocumentPath from "~/hooks/useSearchDocumentPath";
import useStores from "~/hooks/useStores";
import { newDocumentPath } from "~/utils/routeHelpers";

type Props = {
  template: Document;
  onRequestClose: () => void;
};

function NewDocumentFromTemplate({ template, onRequestClose }: Props) {
  const { collections } = useStores();
  const { t } = useTranslation();
  const { searchResult, setSearchTerm } = useSearchDocumentPath();

  const handleFilter = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(ev.target.value);
  };

  const row = ({
    index,
    data,
    style,
  }: {
    index: number;
    data: DocumentPath[];
    style: React.CSSProperties;
  }) => {
    const result = data[index];
    return (
      <PathToDocument
        documentPath={result}
        currentDocument={template}
        collection={collections.get(result.collectionId)}
        onClick={onRequestClose}
        href={newDocumentPath(template.collectionId, {
          parentDocumentId: result.id,
          templateId: template.id,
        })}
        style={style}
      />
    );
  };

  if (!template || !template.isTemplate || !collections.isLoaded) {
    return null;
  }

  return (
    <Flex column>
      <Section column>
        <Labeled label={t("Choose the location for the new document")} />
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
              {({ width, height }: { width: number; height: number }) => (
                <Flex role="listbox" column>
                  <List
                    key={searchResult.length}
                    width={width}
                    height={height}
                    itemData={searchResult}
                    itemCount={searchResult.length}
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

export default observer(NewDocumentFromTemplate);
