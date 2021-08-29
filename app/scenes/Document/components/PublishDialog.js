// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogBackdrop, type DialogStateReturn } from "reakit";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Document from "models/Document";
import DocumentPathList from "../../../components/DocumentPathList";
import useToasts from "hooks/useToasts";

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

  // React.useEffect(() => {
  //   if (!dialog.visible) {
  //     setSelectedPath(undefined);
  //   }
  // }, [dialog.visible]);

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
              <DocumentPathList
                document={document}
                handleSelect={handlePublishFromModal}
                selectName={t("Publish")}
              />
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

  ${breakpoint("mobile", "tablet")`
    position: fixed !important;
    transform: none !important;
    top: auto !important;
    right: 8px !important;
    bottom: 16px !important;
    left: 8px !important;
  `};
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
    width: 90vw;
`};
`;

export default PublishDialog;
