import { observer } from "mobx-react";
import { MoonIcon, SunIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import { Theme } from "~/stores/UiStore";

export default observer(function ThemeToggle() {
  const { t } = useTranslation();
  const { ui } = useStores();
  const { resolvedTheme, themeOverride } = ui;

  if (themeOverride) {
    return null;
  }

  const handleToggle = () => {
    const newTheme =
      resolvedTheme === "light" ? Theme.Dark : Theme.Light;
    ui.setTheme(newTheme);
  };

  return (
    <Tooltip
      content={
        resolvedTheme === "light"
          ? t("Switch to dark")
          : t("Switch to light")
      }
      placement="bottom"
    >
      <Button
        icon={resolvedTheme === "light" ? <SunIcon /> : <MoonIcon />}
        onClick={handleToggle}
        aria-label={
          resolvedTheme === "light"
            ? t("Switch to dark")
            : t("Switch to light")
        }
        neutral
        borderOnHover
      />
    </Tooltip>
  );
});
