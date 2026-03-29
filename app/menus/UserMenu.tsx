import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import type User from "~/models/User";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { useUserMenuActions } from "~/hooks/useUserMenuActions";

type Props = {
  user: User;
};

function UserMenu({ user }: Props) {
  const { t } = useTranslation();
  const rootAction = useUserMenuActions(user);

  return (
    <DropdownMenu action={rootAction} align="end" ariaLabel={t("User options")}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(UserMenu);
