import { observer } from "mobx-react";
import { useEffect } from "react";
import useStores from "~/hooks/useStores";

function LoadingIndicator() {
  const { ui } = useStores();

  useEffect(() => {
    ui.enableProgressBar();
    return () => ui.disableProgressBar();
  }, [ui]);

  return null;
}

export default observer(LoadingIndicator);
