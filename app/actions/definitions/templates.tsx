import { MoveIcon, PlusIcon, TrashIcon } from "outline-icons";
import { Trans } from "react-i18next";
import { toast } from "sonner";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import TemplateMove from "~/components/DocumentExplorer/TemplateMove";
import { TemplateNew } from "~/components/Template/TemplateNew";
import { createAction } from "~/actions";
import { ActiveTemplateSection, TemplateSection } from "../sections";

export const createTemplate = createAction({
  name: ({ t }) => t("New template"),
  analyticsName: "New template",
  section: TemplateSection,
  icon: <PlusIcon />,
  keywords: "new create template",
  visible: ({ currentTeamId, stores }) =>
    !!stores.policies.abilities(currentTeamId!).createTemplate,
  perform: ({ stores, event }) => {
    event?.preventDefault();
    event?.stopPropagation();

    stores.dialogs.openModal({
      title: "",
      content: <TemplateNew onSubmit={stores.dialogs.closeAllModals} />,
      fullscreen: true,
    });
  },
});

export const deleteTemplate = createAction({
  name: ({ t }) => `${t("Delete")}…`,
  analyticsName: "Delete template",
  section: ActiveTemplateSection,
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

export const moveTemplate = createAction({
  name: ({ t }) => t("Move"),
  analyticsName: "Move template",
  section: ActiveTemplateSection,
  icon: <MoveIcon />,
  visible: ({ activeTemplateId, stores }) => {
    if (!activeTemplateId) {
      return false;
    }
    return !!stores.policies.abilities(activeTemplateId).move;
  },
  perform: ({ activeTemplateId, stores, t }) => {
    if (activeTemplateId) {
      const template = stores.templates.get(activeTemplateId);
      if (!template) {
        return;
      }

      stores.dialogs.openModal({
        title: t("Move template"),
        content: <TemplateMove template={template} />,
      });
    }
  },
});

export const rootTemplateActions = [moveTemplate];
