import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import KeyboardShortcuts from "~/scenes/KeyboardShortcuts";
import { useDesktopTitlebar } from "~/hooks/useDesktopTitlebar";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import Desktop from "~/utils/Desktop";

export default function DesktopEventHandler() {
  useDesktopTitlebar();
  const { t } = useTranslation();
  const history = useHistory();
  const { dialogs } = useStores();
  const { showToast } = useToasts();

  React.useEffect(() => {
    Desktop.bridge?.redirect((path: string, replace = false) => {
      if (replace) {
        history.replace(path);
      } else {
        history.push(path);
      }
    });

    Desktop.bridge?.updateDownloaded(() => {
      showToast("An update is ready to install.", {
        type: "info",
        timeout: Infinity,
        action: {
          text: "Install now",
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
  }, [t, history, dialogs, showToast]);

  return null;
}
