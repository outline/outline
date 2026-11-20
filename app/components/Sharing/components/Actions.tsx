import { useKBar } from "kbar";
import { observer } from "mobx-react";
import { MoonIcon, SearchIcon, SunIcon, SubscribeIcon } from "outline-icons";
import { useCallback, useState } from "react";
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
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import { Theme } from "~/stores/UiStore";

export const AppearanceAction = observer(() => {
  const { t } = useTranslation();
  const { ui } = useStores();
  const { resolvedTheme, themeOverride } = ui;
  const isMobile = useMobile();

  // Hide when theme is locked via query parameter
  if (themeOverride || isMobile) {
    return null;
  }

  return (
    <Action>
      <Tooltip
        content={
          resolvedTheme === "light" ? t("Switch to dark") : t("Switch to light")
        }
        side="bottom"
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

/**
 * A header button that opens search on public shares, shown only on mobile
 * where the sidebar search button is hidden.
 */
export function SearchAction() {
  const { t } = useTranslation();
  const { query } = useKBar();
  const isMobile = useMobile();

  const handleClick = useCallback(() => {
    query.toggle();
  }, [query]);

  if (!isMobile) {
    return null;
  }

  return (
    <Action>
      <Button
        icon={<SearchIcon />}
        onClick={handleClick}
        aria-label={t("Search")}
        neutral
        borderOnHover
      />
    </Action>
  );
}

export function SubscribeAction({
  shareId,
  documentId,
}: {
  shareId: string;
  documentId?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Action>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip content={t("Subscribe to updates")} side="bottom">
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
          <ShareSubscribeForm shareId={shareId} documentId={documentId} />
        </PopoverContent>
      </Popover>
    </Action>
  );
}
