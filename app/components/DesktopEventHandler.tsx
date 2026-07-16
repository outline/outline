import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import KeyboardShortcuts from "~/scenes/KeyboardShortcuts";
import { useDesktopTitlebar } from "~/hooks/useDesktopTitlebar";
import useStores from "~/hooks/useStores";
import Desktop from "~/utils/Desktop";
import history from "~/utils/history";

export default function DesktopEventHandler() {
  useDesktopTitlebar();
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const hasDisabledUpdateMessage = useRef(false);

  useEffect(() => {
    Desktop.bridge?.redirect((path: string, replace: boolean) => {
      if (replace) {
        history.replace(path);
      } else {
        history.push(path);
      }
    });

    Desktop.bridge?.updateDownloaded(() => {
      if (hasDisabledUpdateMessage.current) {
        return;
      }

      hasDisabledUpdateMessage.current = true;
      toast.message("An update is ready to install.", {
        duration: Infinity,
        dismissible: true,
        action: {
          label: t("Install now"),
          onClick: () => {
            void Desktop.bridge?.restartAndInstall();
          },
        },
      });
    });

    Desktop.bridge?.focus(() => {
      window.document.body.classList.remove("backgrounded");
    });

    Desktop.bridge?.blur(() => {
      window.document.body.classList.add("backgrounded");
    });

    Desktop.bridge?.openKeyboardShortcuts(() => {
      dialogs.openGuide({
        title: t("Keyboard shortcuts"),
        content: <KeyboardShortcuts />,
      });
    });
  }, [t, dialogs]);

  return null;
}
