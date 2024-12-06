import { observer } from "mobx-react";
import { KeyboardIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import KeyboardShortcuts from "~/scenes/KeyboardShortcuts";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useEditingFocus from "~/hooks/useEditingFocus";
import useStores from "~/hooks/useStores";

function KeyboardShortcutsButton() {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const isEditingFocus = useEditingFocus();

  const handleOpenKeyboardShortcuts = () => {
    dialogs.openGuide({
      title: t("Keyboard shortcuts"),
      content: <KeyboardShortcuts />,
    });
  };

  return (
    <Tooltip content={t("Keyboard shortcuts")} shortcut="?">
      <Button onClick={handleOpenKeyboardShortcuts} $hidden={isEditingFocus}>
        <KeyboardIcon />
      </Button>
    </Tooltip>
  );
}

const Button = styled(NudeButton)<{ $hidden: boolean }>`
  display: none;
  position: fixed;
  bottom: 0;
  margin: 20px;
  transition: opacity 500ms ease-in-out;
  ${(props) => props.$hidden && "opacity: 0;"}

  ${breakpoint("tablet")`
    display: block;
  `};

  @media print {
    display: none;
  }
`;

export default observer(KeyboardShortcutsButton);
