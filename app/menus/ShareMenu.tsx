import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import type Share from "~/models/Share";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useShareMenuActions } from "~/hooks/useShareMenuActions";

type Props = {
  share: Share;
};

function ShareMenu({ share }: Props) {
  const { t } = useTranslation();
  const rootAction = useShareMenuActions();

  return (
    <ActionContextProvider value={{ activeModels: [share] }}>
      <DropdownMenu
        action={rootAction}
        align="end"
        ariaLabel={t("Share options")}
      >
        <OverflowMenuButton />
      </DropdownMenu>
    </ActionContextProvider>
  );
}

export default observer(ShareMenu);
