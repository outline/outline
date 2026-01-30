import { observer } from "mobx-react";
import { KeyboardIcon } from "outline-icons";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import KeyboardShortcuts from "~/scenes/KeyboardShortcuts";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useEditingFocus from "~/hooks/useEditingFocus";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";

function KeyboardShortcutsButton() {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const isEditingFocus = useEditingFocus();
  const query = useQuery();
  const shortcutsQuery = query.get("shortcuts");

  const handleOpenKeyboardShortcuts = (defaultQuery?: string) => {
    dialogs.openGuide({
      title: t("Keyboard shortcuts"),
      content: <KeyboardShortcuts defaultQuery={defaultQuery} />,
    });
  };

  useEffect(() => {
    if (shortcutsQuery !== null) {
      handleOpenKeyboardShortcuts(shortcutsQuery);
    }
  }, [shortcutsQuery]);

  return (
    <Tooltip content={t("Keyboard shortcuts")} shortcut="?">
      <Button
        onClick={() => handleOpenKeyboardShortcuts()}
        $hidden={isEditingFocus}
        aria-label={t("Keyboard shortcuts")}
      >
        <KeyboardIcon />
      </Button>
    </Tooltip>
  );
}

const Button = styled(NudeButton)<{ $hidden: boolean }>`
  display: none;
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
