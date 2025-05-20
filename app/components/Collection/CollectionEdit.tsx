import { observer } from "mobx-react";
import { useCallback } from "react";
import { toast } from "sonner";
import useStores from "~/hooks/useStores";
import { CollectionForm, FormData } from "./CollectionForm";

type Props = {
  collectionId: string;
  onSubmit: () => void;
};

export const CollectionEdit = observer(function CollectionEdit_({
  collectionId,
  onSubmit,
}: Props) {
  const { collections } = useStores();
  const collection = collections.get(collectionId);

  const handleSubmit = useCallback(
    async (data: FormData) => {
      try {
        await collection?.save(data);
        onSubmit?.();
      } catch (error) {
        toast.error(error.message);
      }
    },
    [collection, onSubmit]
  );

  return <CollectionForm collection={collection} handleSubmit={handleSubmit} />;
});
