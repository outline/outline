import { observer } from "mobx-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import Template from "~/models/Template";
import useStores from "~/hooks/useStores";
import { TemplateForm } from "./TemplateForm";

type Props = {
  onSubmit?: () => void;
};

export const TemplateNew = observer(function TemplateNew_({ onSubmit }: Props) {
  const { templates } = useStores();
  const [template] = useState(new Template({}, templates));

  const handleSubmit = useCallback(async () => {
    try {
      await template.save();
      onSubmit?.();
    } catch (error) {
      toast.error(error.message);
    }
  }, [template, onSubmit]);

  if (!template) {
    return null;
  }

  return <TemplateForm template={template} handleSubmit={handleSubmit} />;
});
