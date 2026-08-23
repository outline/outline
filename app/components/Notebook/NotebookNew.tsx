import { runInAction } from "mobx";
import { observer } from "mobx-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import type { FormData } from "./NotebookForm";
import { NotebookForm } from "./NotebookForm";
type Props = {
  onSubmit: () => void;
};
export const NotebookNew = observer(function NotebookNew_({ onSubmit }: Props) {
  const { notebooks } = useStores();
  const handleSubmit = useCallback(
    async (data: FormData) => {
      try {
        const notebook = await notebooks.save(data);
        // Avoid flash of loading state for the new notebook, we know it's empty.
        runInAction(() => {
          notebook.notes = [];
        });
        onSubmit?.();
        history.push(notebook.path);
      } catch (error) {
        toast.error(errToString(error));
      }
    },
    [notebooks, onSubmit]
  );
  return <NotebookForm handleSubmit={handleSubmit} />;
});
