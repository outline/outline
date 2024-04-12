import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit/Menu";
import ContextMenu from "~/components/ContextMenu";
import Template from "~/components/ContextMenu/Template";
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
import usePrevious from "~/hooks/usePrevious";
import useStores from "~/hooks/useStores";
import separator from "~/menus/separator";

type Props = {
  children?: React.ReactNode;
};

const AccountMenu: React.FC = ({ children }: Props) => {
  const menu = useMenuState({
    placement: "bottom-end",
    modal: true,
  });
  const { ui } = useStores();
  const { theme } = ui;
  const previousTheme = usePrevious(theme);
  const { t } = useTranslation();

  React.useEffect(() => {
    if (theme !== previousTheme) {
      menu.hide();
    }
  }, [menu, theme, previousTheme]);

  const actions = React.useMemo(
    () => [
      openKeyboardShortcuts,
      openDocumentation,
      openAPIDocumentation,
      separator(),
      openChangelog,
      openFeedbackUrl,
      openBugReportUrl,
      changeTheme,
      navigateToProfileSettings,
      navigateToAccountPreferences,
      separator(),
      logout,
    ],
    []
  );

  return (
    <>
      <MenuButton {...menu}>{children}</MenuButton>
      <ContextMenu {...menu} aria-label={t("Account")}>
        <Template {...menu} items={undefined} actions={actions} />
      </ContextMenu>
    </>
  );
};

export default observer(AccountMenu);
