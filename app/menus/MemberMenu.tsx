import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import User from "~/models/User";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import useCurrentUser from "~/hooks/useCurrentUser";

type Props = {
  user: User;
  onRemove: () => void;
};

function MemberMenu({ user, onRemove }: Props) {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const menu = useMenuState({
    modal: false,
  });

  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu} aria-label={t("Member options")}>
        <Template
          {...menu}
          items={[
            {
              type: "button",
              title: currentUser.id === user.id ? t("Leave") : t("Remove"),
              dangerous: true,
              onClick: onRemove,
            },
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default MemberMenu;
