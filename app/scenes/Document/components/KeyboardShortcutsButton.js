// @flow
import { KeyboardIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
import Guide from "components/Guide";
import NudeButton from "components/NudeButton";
import Tooltip from "components/Tooltip";

function KeyboardShortcutsButton() {
  const { t } = useTranslation();
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = React.useState(
    false
  );

  const handleCloseKeyboardShortcuts = React.useCallback(() => {
    setKeyboardShortcutsOpen(false);
  }, []);

  const handleOpenKeyboardShortcuts = React.useCallback(() => {
    setKeyboardShortcutsOpen(true);
  }, []);

  return (
    <>
      <Guide
        isOpen={keyboardShortcutsOpen}
        onRequestClose={handleCloseKeyboardShortcuts}
        title={t("Keyboard shortcuts")}
      >
        <KeyboardShortcuts />
      </Guide>
      <Tooltip
        tooltip={t("Keyboard shortcuts")}
        shortcut="?"
        placement="left"
        delay={500}
      >
        <Button onClick={handleOpenKeyboardShortcuts}>
          <KeyboardIcon />
        </Button>
      </Tooltip>
    </>
  );
}

const Button = styled(NudeButton)`
  display: none;
  position: fixed;
  bottom: 0;
  right: 0;
  margin: 24px;

  ${breakpoint("tablet")`
    display: block;
  `};

  @media print {
    display: none;
  }
`;

export default KeyboardShortcutsButton;
