import invariant from "invariant";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import useStores from "~/hooks/useStores";
import { documentPath } from "~/utils/routeHelpers";
import Flex from "./Flex";
import Switch from "./Switch";
import Text from "./Text";

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
  const [workspace, setWorkspace] = React.useState(false);

  const handlePublishChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setPublish(ev.target.checked);
    },
    []
  );

  const handleWorkspaceChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setWorkspace(ev.target.checked);
    },
    []
  );

  const handleSubmit = React.useCallback(async () => {
    const template = await document?.templatize({ publish, workspace });
    if (template) {
      history.push(documentPath(template));
      toast.success(t("Template created, go ahead and customize it"));
    }
  }, [document, history, t, publish, workspace]);

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
        <Text>
          <Switch
            name="publish"
            label={t("Published")}
            note={t(
              "Create a published template that's available for use immediately."
            )}
            checked={publish}
            onChange={handlePublishChange}
          />
        </Text>
        <Text>
          <Switch
            name="workspace"
            label={t("Workspace")}
            note={t(
              "Save the template within the workspace to enable sharing across collections."
            )}
            checked={workspace}
            onChange={handleWorkspaceChange}
          />
        </Text>
      </Flex>
    </ConfirmationDialog>
  );
}

export default observer(DocumentTemplatizeDialog);
