import { MoveIcon, NewDocumentIcon, PlusIcon, TrashIcon } from "outline-icons";
import { Trans } from "react-i18next";
import { toast } from "sonner";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import TemplateMove from "~/components/DocumentExplorer/TemplateMove";
import { createAction, createInternalLinkAction } from "~/actions";
import { newDocumentPath, newTemplatePath } from "~/utils/routeHelpers";
import { ActiveTemplateSection, TemplateSection } from "../sections";
import Template from "~/models/Template";

export const createTemplate = createInternalLinkAction({
  name: ({ t }) => t("New template"),
  analyticsName: "New template",
  section: TemplateSection,
  icon: <PlusIcon />,
  keywords: "new create template",
  visible: ({ currentTeamId, stores }) =>
    !!stores.policies.abilities(currentTeamId!).createTemplate,
  to: newTemplatePath(),
});

export const deleteTemplate = createAction({
  name: ({ t }) => `${t("Delete")}…`,
  analyticsName: "Delete template",
  section: ActiveTemplateSection,
  icon: <TrashIcon />,
  dangerous: true,
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Template).some((policy) => policy.abilities.delete),
  perform: ({ getActiveModel, stores, t }) => {
    const template = getActiveModel(Template);
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
  },
});

export const moveTemplate = createAction({
  name: ({ t }) => t("Move"),
  analyticsName: "Move template",
  section: ActiveTemplateSection,
  icon: <MoveIcon />,
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Template).some((policy) => policy.abilities.move),
  perform: ({ getActiveModel, stores, t }) => {
    const template = getActiveModel(Template);
    if (!template) {
      return;
    }

    stores.dialogs.openModal({
      title: t("Move template"),
      content: <TemplateMove template={template} />,
    });
  },
});

export const createDocumentFromTemplate = createInternalLinkAction({
  name: ({ t }) => t("New document"),
  analyticsName: "New document from template",
  section: ActiveTemplateSection,
  icon: <NewDocumentIcon />,
  keywords: "create",
  visible: ({ currentTeamId, getActiveModel, stores }) => {
    const template = getActiveModel(Template);
    if (!template || !currentTeamId) {
      return false;
    }

    if (template.collectionId) {
      return !!stores.policies.abilities(template.collectionId).createDocument;
    }
    return !!stores.policies.abilities(currentTeamId).createDocument;
  },
  to: ({ getActiveModel, activeCollectionId, sidebarContext }) => {
    const template = getActiveModel(Template);
    if (!template) {
      return "";
    }
    const collectionId = template?.collectionId ?? activeCollectionId;

    const [pathname, search] = newDocumentPath(collectionId, {
      templateId: template.id,
    }).split("?");

    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});

export const rootTemplateActions = [moveTemplate, createDocumentFromTemplate];
