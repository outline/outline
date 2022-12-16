import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import styled from "styled-components";
import Document from "~/models/Document";
import Flex from "~/components/Flex";
import { Outline } from "~/components/Input";
import InputSearch from "~/components/InputSearch";
import useStores from "~/hooks/useStores";
import flattenTree from "~/utils/flattenTree";

type Props = {
  document: Document;
};

function PublishPopover({ document }: Props) {
  const { collections } = useStores();
  const { t } = useTranslation();

  const handleSearch = () => {
    return;
  };

  const row = ({ index, data }: { index: number; data: any[] }) => {
    const result = data[index];
    let spaces = "";
    for (let i = 1; i <= result.depth; i++) {
      spaces += "        ";
    }
    return (
      <Title>
        {spaces}
        {result.data.title}
      </Title>
    );
  };

  const data = flattenTree(collections.tree.root).slice(1);

  if (!document || !collections.isLoaded) {
    return null;
  }

  return (
    <>
      <PublishLocationSearch
        type="search"
        onChange={handleSearch}
        placeholder={`${t("Search collections & documents")}…`}
        required
        autoFocus
      />
      <Results>
        <AutoSizer>
          {({ width, height }: { width: number; height: number }) => (
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
    </>
  );
}

const PublishLocationSearch = styled(InputSearch)`
  ${Outline} {
    border-radius: 16px;
  }
  margin-bottom: 16px;
`;

const Results = styled.div`
  padding: 0;
  height: 40vh;
  border-top: 0;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
`;

const Title = styled.p`
  white-space: pre;
`;

export default observer(PublishPopover);
