import { observer } from "mobx-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import useStores from "~/hooks/useStores";
import type { FormData } from "./NotebookForm";
import { NotebookForm } from "./NotebookForm";
type Props = {
  notebookId: string;
  onSubmit: () => void;
};
export const NotebookEdit = observer(function NotebookEdit_({
  notebookId,
  onSubmit,
}: Props) {
  const { notebooks } = useStores();
  const notebook = notebooks.get(notebookId);
  const handleSubmit = useCallback(
    async (data: FormData) => {
      try {
        await notebook?.save(data);
        onSubmit?.();
      } catch (error) {
        toast.error(errToString(error));
      }
    },
    [notebook, onSubmit]
  );
  return <NotebookForm notebook={notebook} handleSubmit={handleSubmit} />;
});
