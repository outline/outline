import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import useStores from "~/hooks/useStores";
import Notifications from "./Notifications";

type Props = {
  children?: React.ReactNode;
};

const NotificationsPopover: React.FC = ({ children }: Props) => {
  const { t } = useTranslation();
  const { notifications } = useStores();
  const [open, setOpen] = React.useState(false);
  const scrollableRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    void notifications.fetchPage({ archived: false });
  }, [notifications]);

  const handleRequestClose = React.useCallback(() => {
    setOpen(false);
  }, []);

  const handleAutoFocus = React.useCallback((event: Event) => {
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
        shrink
      >
        <Notifications
          onRequestClose={handleRequestClose}
          ref={scrollableRef}
        />
      </PopoverContent>
    </Popover>
  );
};

export default observer(NotificationsPopover);
