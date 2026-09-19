import { observer } from "mobx-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import useStores from "~/hooks/useStores";
import type { FormData } from "./CollectionForm";
import { CollectionForm } from "./CollectionForm";

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
        toast.error(errToString(error));
      }
    },
    [collection, onSubmit]
  );

  return <CollectionForm collection={collection} handleSubmit={handleSubmit} />;
});
