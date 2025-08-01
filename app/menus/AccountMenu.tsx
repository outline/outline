import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  navigateToProfileSettings,
  navigateToAccountPreferences,
  openKeyboardShortcuts,
  openChangelog,
  openDocumentation,
  openAPIDocumentation,
  openBugReportUrl,
  openFeedbackUrl,
  logout,
} from "~/actions/definitions/navigation";
import { changeTheme } from "~/actions/definitions/settings";
import { ActionV2Separator } from "~/actions";
import { useMenuAction } from "~/hooks/useMenuAction";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";

type Props = {
  children?: React.ReactNode;
};

const AccountMenu: React.FC = ({ children }: Props) => {
  const { t } = useTranslation();

  const actions = React.useMemo(
    () => [
      openKeyboardShortcuts,
      openDocumentation,
      openAPIDocumentation,
      ActionV2Separator,
      openChangelog,
      openFeedbackUrl,
      openBugReportUrl,
      changeTheme,
      navigateToProfileSettings,
      navigateToAccountPreferences,
      ActionV2Separator,
      logout,
    ],
    []
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} align="end" ariaLabel={t("Account")}>
      {children}
    </DropdownMenu>
  );
};

export default observer(AccountMenu);
