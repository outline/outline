import { observer } from "mobx-react";
import * as React from "react";
import { toast } from "sonner";
import DataAttribute from "~/models/DataAttribute";
import { DataAttributeForm, FormData } from "./DataAttributeForm";

type Props = {
  dataAttribute: DataAttribute;
  onSubmit: () => void;
};

export const DataAttributeEdit = observer(function DataAttributeEdit_({
  dataAttribute,
  onSubmit,
}: Props) {
  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await dataAttribute.save(data);
        onSubmit?.();
      } catch (error) {
        toast.error(error.message);
      }
    },
    [dataAttribute, onSubmit]
  );

  return (
    <DataAttributeForm
      dataAttribute={dataAttribute}
      handleSubmit={handleSubmit}
    />
  );
});
