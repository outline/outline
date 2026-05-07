import { observer } from "mobx-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/primitives/Drawer";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import Notifications from "./Notifications";

type Props = {
  children?: React.ReactNode;
};

const NotificationsPopover: React.FC = ({ children }: Props) => {
  const { t } = useTranslation();
  const { notifications } = useStores();
  const [open, setOpen] = useState(false);
  const isMobile = useMobile();
  const scrollableRef = useRef<HTMLDivElement>(null);
  const drawerContentRef = useRef<React.ElementRef<typeof DrawerContent>>(null);

  useEffect(() => {
    void notifications.fetchPage({ archived: false });
  }, [notifications]);

  const handleRequestClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleAutoFocus = useCallback((event: Event) => {
    // Prevent focus from moving to the popover content
    event.preventDefault();

    // Reset scroll position to the top when popover is opened
    if (scrollableRef.current) {
      scrollableRef.current.scrollTop = 0;
      scrollableRef.current.focus();
    }
  }, []);

  const enablePointerEvents = useCallback(() => {
    if (drawerContentRef.current) {
      drawerContentRef.current.style.pointerEvents = "auto";
    }
  }, []);

  const disablePointerEvents = useCallback(() => {
    if (drawerContentRef.current) {
      drawerContentRef.current.style.pointerEvents = "none";
    }
  }, []);

  const notificationsList = (
    <Notifications onRequestClose={handleRequestClose} ref={scrollableRef} />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent
          ref={drawerContentRef}
          aria-label={t("Notifications")}
          aria-describedby={undefined}
          onAnimationStart={disablePointerEvents}
          onAnimationEnd={enablePointerEvents}
        >
          <DrawerTitle hidden>{t("Notifications")}</DrawerTitle>
          {notificationsList}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent
        aria-label={t("Notifications")}
        side="top"
        align="start"
        onOpenAutoFocus={handleAutoFocus}
        scrollable={false}
        shrink
      >
        {notificationsList}
      </PopoverContent>
    </Popover>
  );
};

export default observer(NotificationsPopover);
