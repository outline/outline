// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogBackdrop, useDialogState } from "reakit/Dialog";
import styled from "styled-components";
import Template from "components/ContextMenu/Template";
import Scrollable from "components/Scrollable";
import useStores from "hooks/useStores";

function QuickMenu() {
  const { quickMenu } = useStores();
  console.log("render");
  const dialog = useDialogState({ modal: true, animated: 250 });
  const { t } = useTranslation();

  const handleSearchChange = React.useCallback(
    (event) => {
      quickMenu.setSearchTerm(event.target.value);
    },
    [quickMenu]
  );

  React.useEffect(() => {
    if (!dialog.visible) {
      quickMenu.setSearchTerm("");
    }
  }, [quickMenu, dialog.visible]);

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "k" && event.metaKey) {
        dialog.visible ? dialog.hide() : dialog.show();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <DialogBackdrop {...dialog}>
      {(props) => (
        <Backdrop {...props}>
          <Dialog
            {...dialog}
            aria-label={t("Quick menu")}
            preventBodyScroll
            hideOnEsc
          >
            {(props) => (
              <Content {...props}>
                <InputWrapper>
                  <input
                    type="search"
                    onChange={handleSearchChange}
                    placeholder={`${t("Search actions")}…`}
                    value={quickMenu.searchTerm}
                  />
                </InputWrapper>
                <Results>
                  <Scrollable topShadow>
                    {quickMenu.resolvedMenuItems.map((context) => (
                      <Template
                        key={context.id}
                        {...dialog}
                        items={[
                          {
                            type: "heading",
                            title: context.title,
                            visible: true,
                          },
                          ...context.items.filter(
                            // $FlowFixMe
                            (item) => item.type !== "separator"
                          ),
                        ]}
                      />
                    ))}
                  </Scrollable>
                </Results>
              </Content>
            )}
          </Dialog>
        </Backdrop>
      )}
    </DialogBackdrop>
  );
}

const InputWrapper = styled.div`
  padding: 16px;
`;

const Results = styled.div`
  height: calc(100% - 64px);
`;

const Content = styled.div`
  background: ${(props) => props.theme.background};
  width: 40vw;
  max-height: 50vh;
  border-radius: 8px;
  overflow: hidden;
  margin: 20vh auto;
  box-shadow: ${(props) => props.theme.menuShadow};
`;

const Backdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${(props) => props.theme.depths.modalOverlay};
`;

export default observer(QuickMenu);
