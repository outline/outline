import invariant from "invariant";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import Switch from "~/components/Switch";
import useStores from "~/hooks/useStores";
import { documentPath } from "~/utils/routeHelpers";
import SelectLocation from "./SelectLocation";

type Props = {
  documentId: string;
};

function DocumentTemplatizeDialog({ documentId }: Props) {
  const history = useHistory();
  const { t } = useTranslation();
  const { documents } = useStores();
  const document = documents.get(documentId);
  invariant(document, "Document must exist");

  const [publish, setPublish] = React.useState(true);
  const [collectionId, setCollectionId] = React.useState(
    document.collectionId ?? null
  );

  const handlePublishChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setPublish(ev.target.checked);
    },
    []
  );

  const handleSubmit = React.useCallback(async () => {
    const template = await document?.templatize({
      collectionId,
      publish,
    });
    if (template) {
      history.push(documentPath(template));
      toast.success(t("Template created, go ahead and customize it"));
    }
  }, [t, document, history, collectionId, publish]);

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("Create template")}
      savingText={`${t("Creating")}…`}
    >
      <Flex column gap={12}>
        <div>
          <Trans
            defaults="Creating a template from <em>{{titleWithDefault}}</em> is a non-destructive action – we'll make a copy of the document and turn it into a template that can be used as a starting point for new documents."
            values={{
              titleWithDefault: document.titleWithDefault,
            }}
            components={{
              em: <strong />,
            }}
          />
        </div>
        <SelectLocation
          defaultCollectionId={collectionId}
          onSelect={setCollectionId}
        />
        <Switch
          name="publish"
          label={t("Published")}
          note={t("Enable other members to use the template immediately")}
          checked={publish}
          onChange={handlePublishChange}
        />
      </Flex>
    </ConfirmationDialog>
  );
}

export default observer(DocumentTemplatizeDialog);
