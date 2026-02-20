import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import type Group from "~/models/Group";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { useGroupMenuActions } from "~/hooks/useGroupMenuActions";

type Props = {
  group: Group;
};

function GroupMenu({ group }: Props) {
  const { t } = useTranslation();
  const rootAction = useGroupMenuActions(group);

  return (
    <DropdownMenu
      action={rootAction}
      align="end"
      ariaLabel={t("Group options")}
    >
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(GroupMenu);
