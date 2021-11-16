import { KeyboardIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
import Guide from "components/Guide";
import NudeButton from "components/NudeButton";
import Tooltip from "components/Tooltip";
import useBoolean from "hooks/useBoolean";

function KeyboardShortcutsButton() {
  const { t } = useTranslation();
  const [
    keyboardShortcutsOpen,
    handleOpenKeyboardShortcuts,
    handleCloseKeyboardShortcuts,
  ] = useBoolean();
  return (
    <>
      <Guide
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean | (() => void)' is not assignable to... Remove this comment to see the full error message
        isOpen={keyboardShortcutsOpen}
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean | (() => void)' is not assignable to... Remove this comment to see the full error message
        onRequestClose={handleCloseKeyboardShortcuts}
        title={t("Keyboard shortcuts")}
      >
        <KeyboardShortcuts />
      </Guide>
      <Tooltip tooltip={t("Keyboard shortcuts")} shortcut="?" delay={500}>
        // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this
        call.
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
