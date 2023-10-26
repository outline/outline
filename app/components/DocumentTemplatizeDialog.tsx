import invariant from "invariant";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import useStores from "~/hooks/useStores";
import { documentPath } from "~/utils/routeHelpers";

type Props = {
  documentId: string;
};

function DocumentTemplatizeDialog({ documentId }: Props) {
  const history = useHistory();
  const { t } = useTranslation();
  const { documents } = useStores();
  const document = documents.get(documentId);
  invariant(document, "Document must exist");

  const handleSubmit = React.useCallback(async () => {
    const template = await document?.templatize();
    if (template) {
      history.push(documentPath(template));
      toast.success(t("Template created, go ahead and customize it"));
    }
  }, [document, history, t]);

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("Create template")}
      savingText={`${t("Creating")}…`}
    >
      <Trans
        defaults="Creating a template from <em>{{titleWithDefault}}</em> is a non-destructive action – we'll make a copy of the document and turn it into a template that can be used as a starting point for new documents."
        values={{
          titleWithDefault: document.titleWithDefault,
        }}
        components={{
          em: <strong />,
        }}
      />
    </ConfirmationDialog>
  );
}

export default observer(DocumentTemplatizeDialog);
