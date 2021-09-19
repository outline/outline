// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import { Dialog, DialogBackdrop, type DialogStateReturn } from "reakit";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Document from "models/Document";
import Button from "components/Button";
import Divider from "components/Divider";
import Flex from "components/Flex";
import InputSearch from "components/InputSearch";
import useListDocumentPath from "hooks/useListDocumentPath";
import useToasts from "hooks/useToasts";
import { mobileContextMenu, fadeAndSlideDown } from "styles/animations";

type Props = {|
  dialog: DialogStateReturn,
  document: Document,
  onSave: ({
    done?: boolean,
    publish?: boolean,
    autosave?: boolean,
  }) => void,
|};

const PublishDialog = ({ dialog, document, onSave }: Props) => {
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const {
    row,
    results,
    searchTerm,
    setSearchTerm,
    selectedPath,
    setSelectedPath,
  } = useListDocumentPath(document);

  React.useEffect(() => {
    if (!dialog.visible) {
      setSelectedPath(undefined);
    }
  }, [dialog.visible, setSelectedPath]);

  const handleChange = React.useCallback(
    (event) => {
      setSearchTerm(event.target.value);
    },
    [setSearchTerm]
  );

  const handleKeyDown = React.useCallback(
    (event) => {
      if (event.currentTarget.value && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setSearchTerm("");
      }
    },
    [setSearchTerm]
  );

  const handlePublishFromModal = React.useCallback(
    async (selectedPath) => {
      if (!document) return;
      if (!selectedPath) {
        showToast(t("Please select a path"));
        return;
      }

      if (selectedPath.type === "collection") {
        await onSave({
          done: true,
          publish: true,
          collectionId: selectedPath.collectionId,
        });
      } else {
        await onSave({
          done: true,
          publish: true,
          collectionId: selectedPath.collectionId,
          parentDocumentId: selectedPath.id,
        });
      }
      dialog.setVisible(false);
    },
    [dialog, document, onSave, showToast, t]
  );

  const data = results;

  return (
    <Wrapper>
      <DialogBackdrop {...dialog}>
        <Dialog
          {...dialog}
          aria-label="Choose a collection"
          preventBodyScroll
          hideOnEsc
        >
          <Position>
            <Content>
              <Flex align="center">
                <InputSearch
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  value={searchTerm}
                  placeholder={`${t("Search collections & documents")}…`}
                  flex
                />
              </Flex>
              <Results>
                <AutoSizer>
                  {({ width, height }) => {
                    return (
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
                    );
                  }}
                </AutoSizer>
              </Results>
              <Divider />
              <ButtonWrapper justify="flex-end">
                <Button
                  disabled={!selectedPath}
                  onClick={() => handlePublishFromModal(selectedPath)}
                >
                  Publish
                </Button>
              </ButtonWrapper>
            </Content>
          </Position>
        </Dialog>
      </DialogBackdrop>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  position: relative;
`;

const Position = styled.div`
  position: absolute;
  z-index: ${(props) => props.theme.depths.menu};
  right: 8vh;
  top: 4vh;
  animation: ${mobileContextMenu} 200ms ease;
  transform-origin: 50% 100%;

  ${breakpoint("mobile", "tablet")`
    position: fixed !important;
    transform: none !important;
    top: auto !important;
    right: 8px !important;
    bottom: 16px !important;
    left: 8px !important;
  `};

  ${breakpoint("tablet")`
    animation: ${fadeAndSlideDown} 200ms ease;
    transform-origin: 75% 0;
  `}
`;

const Results = styled.div`
  padding: 8px 0;
  height: calc(93% - 52px);
`;

const Content = styled.div`
  background: ${(props) => props.theme.background};
  width: 70vw;
  max-width: 600px;
  height: 40vh;
  max-height: 500px;
  border-radius: 8px;
  padding: 10px;
  box-shadow: ${(props) => props.theme.menuShadow};

  ${breakpoint("mobile", "tablet")`
    right: -2vh;
    width: 95vw;
`};
`;

const ButtonWrapper = styled(Flex)`
  margin: 10px 0;
`;

export default PublishDialog;
