import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import type Emoji from "~/models/Emoji";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { useEmojiMenuActions } from "~/hooks/useEmojiMenuActions";

type Props = {
  emoji: Emoji;
};

function EmojisMenu({ emoji }: Props) {
  const { t } = useTranslation();
  const rootAction = useEmojiMenuActions(emoji);

  return (
    <DropdownMenu
      action={rootAction}
      align="end"
      ariaLabel={t("Emoji options")}
    >
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(EmojisMenu);
