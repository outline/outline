import { observer } from "mobx-react";
import * as React from "react";
import { toast } from "sonner";
import DataAttribute from "~/models/DataAttribute";
import useStores from "~/hooks/useStores";
import { DataAttributeForm, FormData } from "./DataAttributeForm";

type Props = {
  onSubmit: () => void;
};

export const DataAttributeNew = observer(function DataAttributeNew_({
  onSubmit,
}: Props) {
  const { dataAttributes } = useStores();
  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        const dataAttribute = new DataAttribute(data, dataAttributes);
        await dataAttribute.save();
        onSubmit?.();
      } catch (error) {
        toast.error(error.message);
      }
    },
    [dataAttributes, onSubmit]
  );

  return <DataAttributeForm handleSubmit={handleSubmit} />;
});
