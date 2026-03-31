import { observer } from "mobx-react";
import { MoonIcon, SunIcon, SubscribeIcon } from "outline-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import Tooltip from "~/components/Tooltip";
import { ShareSubscribeForm } from "./ShareSubscribeForm";
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

export function SubscribeAction({ shareId }: { shareId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Action>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip content={t("Subscribe to updates")} placement="bottom">
          <PopoverTrigger>
            <Button
              icon={<SubscribeIcon />}
              aria-label={t("Subscribe to updates")}
              neutral
              borderOnHover
            />
          </PopoverTrigger>
        </Tooltip>
        <PopoverContent side="bottom" align="end" width={340}>
          <ShareSubscribeForm shareId={shareId} />
        </PopoverContent>
      </Popover>
    </Action>
  );
}
