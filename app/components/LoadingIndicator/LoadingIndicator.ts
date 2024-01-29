import { observer } from "mobx-react";
import * as React from "react";
import useStores from "~/hooks/useStores";

function LoadingIndicator() {
  const { ui } = useStores();

  React.useEffect(() => {
    ui.enableProgressBar();
    return () => ui.disableProgressBar();
  }, [ui]);

  return null;
}

export default observer(LoadingIndicator);
