import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import { useMenuState } from "~/hooks/useMenuState";

type Props = {
  onMembers: () => void;
  onRemove: () => void;
};

function CollectionGroupMemberMenu({ onMembers, onRemove }: Props) {
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
              title: t("Members"),
              onClick: onMembers,
            },
            {
              type: "separator",
            },
            {
              type: "button",
              title: t("Remove"),
              dangerous: true,
              onClick: onRemove,
            },
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default observer(CollectionGroupMemberMenu);
