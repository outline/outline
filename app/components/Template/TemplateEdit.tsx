import { observer } from "mobx-react";
import { useCallback } from "react";
import { toast } from "sonner";
import useStores from "~/hooks/useStores";
import { TemplateForm } from "./TemplateForm";

type Props = {
  templateId: string;
  onSubmit: () => void;
};

export const TemplateEdit = observer(function TemplateEdit_({
  templateId,
  onSubmit,
}: Props) {
  const { templates } = useStores();
  const template = templates.get(templateId);

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
