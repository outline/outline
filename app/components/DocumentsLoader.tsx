import { observer } from "mobx-react";
import * as React from "react";
import Collection from "~/models/Collection";
import { resolvePromise } from "~/utils/suspense";

type Props = {
  collection: Collection;
  children: React.ReactNode;
};

function DocumentsLoader({ collection, children }: Props) {
  resolvePromise(collection.fetchDocuments());
  return <>{children}</>;
}

export default observer(DocumentsLoader);
