import { observer } from "mobx-react";
import * as React from "react";
import type Notebook from "~/models/Notebook";
type Props = {
  enabled: boolean;
  notebook: Notebook;
  children: React.ReactNode;
};
function NotesLoader({ notebook, enabled, children }: Props) {
  React.useEffect(() => {
    if (enabled) {
      void notebook.fetchNotes();
    }
  }, [notebook, enabled]);
  return <>{children}</>;
}
export default observer(NotesLoader);
