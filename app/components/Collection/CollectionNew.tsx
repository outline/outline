import { observer } from "mobx-react";
import * as React from "react";
import { toast } from "sonner";
import Collection from "~/models/Collection";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import { CollectionForm, FormData } from "./CollectionForm";

type Props = {
  onSubmit: () => void;
};

export const CollectionNew = observer(function CollectionNew_({
  onSubmit,
}: Props) {
  const { collections } = useStores();
  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        const collection = new Collection(data, collections);
        await collection.save();
        onSubmit?.();
        history.push(collection.path);
      } catch (error) {
        toast.error(error.message);
      }
    },
    [collections, onSubmit]
  );

  return <CollectionForm handleSubmit={handleSubmit} />;
});
