import { TrashIcon } from "outline-icons";
import * as React from "react";
import { Trans } from "react-i18next";
import { toast } from "sonner";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import { createAction } from "~/actions";
import { TemplateSection } from "../sections";

export const deleteTemplate = createAction({
  name: ({ t }) => `${t("Delete")}…`,
  analyticsName: "Delete template",
  section: TemplateSection,
  icon: <TrashIcon />,
  dangerous: true,
  visible: ({ activeTemplateId, stores }) => {
    if (!activeTemplateId) {
      return false;
    }
    return !!stores.policies.abilities(activeTemplateId).delete;
  },
  perform: ({ activeTemplateId, stores, t }) => {
    if (activeTemplateId) {
      const template = stores.templates.get(activeTemplateId);
      if (!template) {
        return;
      }

      stores.dialogs.openModal({
        title: t("Delete {{ documentName }}", {
          documentName: t("template"),
        }),
        content: (
          <ConfirmationDialog
            onSubmit={async () => {
              await template.delete();
              toast.success(t("Template deleted"));
            }}
            savingText={`${t("Deleting")}…`}
            danger
          >
            <Trans
              defaults="Are you sure about that? Deleting the <em>{{ templateName }}</em> template is permanent."
              values={{
                templateName: template.titleWithDefault,
              }}
              components={{
                em: <strong />,
              }}
            />
          </ConfirmationDialog>
        ),
      });
    }
  },
});

export const rootTemplateActions = [];
