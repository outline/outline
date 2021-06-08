// @flow
import { observer } from "mobx-react";
import { transparentize } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogBackdrop, useDialogState } from "reakit/Dialog";
import styled from "styled-components";
import InputSearch from "components/InputSearch";
import usePrevious from "hooks/usePrevious";

function QuickJump({ isOpen, requestClose }) {
  const dialog = useDialogState({ modal: true, animated: 250 });
  const wasOpen = usePrevious(isOpen);
  const { t } = useTranslation();

  React.useEffect(() => {
    if (!wasOpen && isOpen) {
      dialog.show();
    }
    if (wasOpen && !isOpen) {
      dialog.hide();
    }
  }, [dialog, wasOpen, isOpen]);

  return (
    <DialogBackdrop {...dialog}>
      {(props) => (
        <Backdrop {...props}>
          <Dialog
            {...dialog}
            hide={requestClose}
            aria-label={t("Quick menu")}
            preventBodyScroll
            hideOnEsc
          >
            {(props) => (
              <Content {...props}>
                <InputSearch />
              </Content>
            )}
          </Dialog>
        </Backdrop>
      )}
    </DialogBackdrop>
  );
}

const Content = styled.div`
  background: ${(props) => props.theme.background};
  width: 40vw;
  border-radius: 8px;
  padding: 16px;
  margin: 20vh auto;
  box-shadow: ${(props) => props.theme.menuShadow};
`;

const Backdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props) =>
    transparentize(0.25, props.theme.background)} !important;
  z-index: ${(props) => props.theme.depths.modalOverlay};
  transition: opacity 50ms ease-in-out;
  opacity: 0;

  &[data-enter] {
    opacity: 1;
  }
`;

export default observer(QuickJump);
