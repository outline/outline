import { observer } from "mobx-react";
import { TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import Emoji from "~/models/Emoji";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

type Props = {
  emoji: Emoji;
};

function EmojiMenu({ emoji }: Props) {
  const { emojis } = useStores();
  const { t } = useTranslation();
  const menu = useMenuState({
    modal: true,
  });
  const can = usePolicy(emoji);

  const handleDelete = React.useCallback(async () => {
    await emojis.delete(emoji);
  }, [emojis, emoji]);

  if (!can.delete) {
    return null;
  }

  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu} aria-label={t("Emoji options")}>
        <Template
          {...menu}
          items={[
            {
              type: "button",
              title: t("Delete"),
              icon: <TrashIcon />,
              dangerous: true,
              onClick: handleDelete,
            },
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default observer(EmojiMenu);
