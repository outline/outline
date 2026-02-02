import { observer } from "mobx-react";
import { MoonIcon, SunIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import { Theme } from "~/stores/UiStore";

export const AppearanceAction = observer(() => {
  const { t } = useTranslation();
  const { ui } = useStores();
  const { resolvedTheme, themeOverride } = ui;

  // Hide when theme is locked via query parameter
  if (themeOverride) {
    return null;
  }

  return (
    <Action>
      <Tooltip
        content={
          resolvedTheme === "light" ? t("Switch to dark") : t("Switch to light")
        }
        placement="bottom"
      >
        <Button
          icon={resolvedTheme === "light" ? <SunIcon /> : <MoonIcon />}
          onClick={() =>
            ui.setTheme(resolvedTheme === "light" ? Theme.Dark : Theme.Light)
          }
          aria-label={
            resolvedTheme === "light"
              ? t("Switch to dark")
              : t("Switch to light")
          }
          neutral
          borderOnHover
        />
      </Tooltip>
    </Action>
  );
});
