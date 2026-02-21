import { observer } from "mobx-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { TemplateForm } from "./TemplateForm";
import type Template from "~/models/Template";

type Props = {
  template: Template;
  onSubmit: () => void;
};

export const TemplateEdit = observer(function TemplateEdit_({
  template,
  onSubmit,
}: Props) {
  const handleSubmit = useCallback(async () => {
    try {
      await template?.save();
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
