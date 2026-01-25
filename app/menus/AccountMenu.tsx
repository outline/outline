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
import { ActionSeparator } from "~/actions";
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
      ActionSeparator,
      openChangelog,
      openFeedbackUrl,
      openBugReportUrl,
      changeTheme,
      navigateToProfileSettings,
      navigateToAccountPreferences,
      ActionSeparator,
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
