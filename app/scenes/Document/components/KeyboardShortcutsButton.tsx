import { observer } from "mobx-react";
import { KeyboardIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import KeyboardShortcuts from "~/scenes/KeyboardShortcuts";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";

function KeyboardShortcutsButton() {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  const handleOpenKeyboardShortcuts = () => {
    dialogs.openGuide({
      title: t("Keyboard shortcuts"),
      content: <KeyboardShortcuts />,
    });
  };

  return (
    <Tooltip tooltip={t("Keyboard shortcuts")} shortcut="?" delay={500}>
      <Button onClick={handleOpenKeyboardShortcuts}>
        <KeyboardIcon />
      </Button>
    </Tooltip>
  );
}

const Button = styled(NudeButton)`
  display: none;
  position: fixed;
  bottom: 0;
  margin: 24px;

  ${breakpoint("tablet")`
    display: block;
  `};

  @media print {
    display: none;
  }
`;

export default observer(KeyboardShortcutsButton);
