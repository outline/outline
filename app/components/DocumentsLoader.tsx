import { observer } from "mobx-react";
import * as React from "react";
import Collection from "~/models/Collection";

type Props = {
  enabled: boolean;
  collection: Collection;
  children: React.ReactNode;
};

function DocumentsLoader({ collection, enabled, children }: Props) {
  React.useEffect(() => {
    if (enabled) {
      void collection.fetchDocuments();
    }
  }, [collection, enabled]);

  return <>{children}</>;
}

export default observer(DocumentsLoader);
