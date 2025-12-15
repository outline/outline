import { observer } from "mobx-react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import useStores from "~/hooks/useStores";
import lazyWithRetry from "~/utils/lazyWithRetry";

const Notifications = lazyWithRetry(() => import("./Notifications"));

type Props = {
  children?: React.ReactNode;
};

const NotificationsPopover: React.FC = ({ children }: Props) => {
  const { t } = useTranslation();
  const { notifications } = useStores();
  const [open, setOpen] = useState(false);
  const scrollableRef = useRef<HTMLDivElement>(null);

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
        <Suspense fallback={null}>
          <Notifications
            onRequestClose={handleRequestClose}
            ref={scrollableRef}
          />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
};

export default observer(NotificationsPopover);
