import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";

type Props = {
  onRemove: () => void;
};

function GroupMemberMenu({ onRemove }: Props) {
  const { t } = useTranslation();
  const menu = useMenuState({
    modal: true,
  });
  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu} aria-label={t("Group member options")}>
        <Template
          {...menu}
          items={[
            {
              type: "button",
              dangerous: true,
              title: t("Remove"),
              onClick: onRemove,
            },
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default observer(GroupMemberMenu);
