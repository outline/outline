// @flow
import { observer } from "mobx-react";
import { transparentize } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogBackdrop, useDialogState } from "reakit/Dialog";
import styled from "styled-components";
import Template from "components/ContextMenu/Template";
import InputSearch from "components/InputSearch";
import Scrollable from "components/Scrollable";
import usePrevious from "hooks/usePrevious";
import useStores from "hooks/useStores";
import useUnmount from "hooks/useUnmount";

function QuickMenu({ isOpen, requestClose }) {
  const { quickMenu } = useStores();
  const dialog = useDialogState({ modal: true, animated: 250 });
  const wasOpen = usePrevious(isOpen);
  const { t } = useTranslation();

  const handleSearchChange = React.useCallback(
    (event) => {
      quickMenu.setSearchTerm(event.target.value);
    },
    [quickMenu]
  );

  useUnmount(() => quickMenu.setSearchTerm(""));

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
                <InputSearch onChange={handleSearchChange} />
                <Scrollable>
                  <ul>
                    {quickMenu.orderedData.map((context) => (
                      <React.Fragment key={context.id}>
                        <h3>{context.title}</h3>
                        <Template
                          hide={requestClose}
                          items={context.items.filter(
                            (item) => item.visible && item.type !== "separator"
                          )}
                        />
                      </React.Fragment>
                    ))}
                  </ul>
                </Scrollable>
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
  height: 50vh;
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

export default observer(QuickMenu);
