import * as React from "react";
import { useHistory } from "react-router-dom";
import { useDesktopTitlebar } from "~/hooks/useDesktopTitlebar";
import useToasts from "~/hooks/useToasts";
import Desktop from "~/utils/Desktop";

export default function DesktopHandler() {
  useDesktopTitlebar();
  const history = useHistory();
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
            Desktop.bridge?.restartAndInstall();
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
  }, [history, showToast]);

  return null;
}
