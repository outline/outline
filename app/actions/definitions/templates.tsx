import copy from "copy-to-clipboard";
import {
  CaseSensitiveIcon,
  CollectionIcon,
  CopyIcon,
  DuplicateIcon,
  MoveIcon,
  NewDocumentIcon,
  PlusIcon,
  PrintIcon,
  TrashIcon,
} from "outline-icons";
import { Trans } from "react-i18next";
import { toast } from "sonner";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import TemplateMove from "~/components/NoteExplorer/TemplateMove";
import {
  createAction,
  createActionWithChildren,
  createInternalLinkAction,
} from "~/actions";
import history from "~/utils/history";
import {
  newNotePath,
  newTemplatePath,
  settingsPath,
  urlify,
} from "~/utils/routeHelpers";
import { ProsemirrorHelper } from "~/models/helpers/ProsemirrorHelper";
import { ActiveTemplateSection, TemplateSection } from "../sections";
import Template from "~/models/Template";
import { AvatarSize } from "~/components/Avatar";
import TeamLogo from "~/components/TeamLogo";
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
        noteName: t("template"),
      }),
      content: (
        <ConfirmationDialog
          onSubmit={async () => {
            await template.delete();
            history.push(settingsPath("templates"));
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
export const moveTemplateToWorkspace = createAction({
  name: ({ t }) => t("Move to workspace"),
  analyticsName: "Move template to workspace",
  section: ActiveTemplateSection,
  icon: ({ stores }) => {
    const { team } = stores.auth;
    return <TeamLogo model={team} size={AvatarSize.Small} />;
  },
  visible: ({ getActiveModel }) => {
    const template = getActiveModel(Template);
    return !!template?.notebookId;
  },
  perform: async ({ getActiveModel, stores, t }) => {
    const template = getActiveModel(Template);
    if (!template) {
      return;
    }
    try {
      await template.save({ notebookId: null });
      toast.success(t("Template moved"));
      stores.dialogs.closeAllModals();
    } catch (_err) {
      toast.error(t("Couldn't move the template, try again?"));
    }
  },
});
export const moveTemplateToNotebook = createAction({
  name: ({ t }) => t("Move to notebook"),
  analyticsName: "Move template to notebook",
  section: ActiveTemplateSection,
  icon: <CollectionIcon />,
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
export const moveTemplate = createActionWithChildren({
  name: ({ t }) => t("Move"),
  analyticsName: "Move template",
  section: ActiveTemplateSection,
  icon: <MoveIcon />,
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Template).some((policy) => policy.abilities.move),
  children: [moveTemplateToWorkspace, moveTemplateToNotebook],
});
export const createNoteFromTemplate = createInternalLinkAction({
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
    if (template.notebookId) {
      return !!stores.policies.abilities(template.notebookId).createNote;
    }
    return !!stores.policies.abilities(currentTeamId).createNote;
  },
  to: ({ getActiveModel, activeNotebookId, sidebarContext }) => {
    const template = getActiveModel(Template);
    if (!template) {
      return "";
    }
    const notebookId = template?.notebookId ?? activeNotebookId;
    const [pathname, search] = newNotePath(notebookId, {
      templateId: template.id,
    }).split("?");
    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});
export const duplicateTemplate = createAction({
  name: ({ t }) => t("Duplicate"),
  analyticsName: "Duplicate template",
  section: ActiveTemplateSection,
  icon: <DuplicateIcon />,
  keywords: "copy",
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Template).some((policy) => policy.abilities.duplicate),
  perform: async ({ getActiveModel, stores }) => {
    const template = getActiveModel(Template);
    if (!template) {
      return;
    }
    await stores.templates.duplicate(template);
  },
});
export const copyTemplateLink = createAction({
  name: ({ t }) => t("Copy link"),
  analyticsName: "Copy template link",
  section: ActiveTemplateSection,
  icon: <CopyIcon />,
  iconInContextMenu: false,
  perform: ({ getActiveModel, t }) => {
    const template = getActiveModel(Template);
    if (template) {
      copy(urlify(template.path));
      toast.success(t("Link copied to clipboard"));
    }
  },
});
export const copyTemplateAsPlainText = createAction({
  name: ({ t }) => t("Copy as text"),
  analyticsName: "Copy template as text",
  section: ActiveTemplateSection,
  icon: <CaseSensitiveIcon />,
  iconInContextMenu: false,
  perform: async ({ getActiveModel, t }) => {
    const template = getActiveModel(Template);
    if (template) {
      copy(ProsemirrorHelper.toPlainText(template));
      toast.success(t("Text copied to clipboard"));
    }
  },
});
export const copyTemplate = createActionWithChildren({
  name: ({ t }) => t("Copy"),
  analyticsName: "Copy template",
  section: ActiveTemplateSection,
  icon: <CopyIcon />,
  keywords: "clipboard",
  children: [copyTemplateLink, copyTemplateAsPlainText],
});
export const printTemplate = createAction({
  name: ({ t, isMenu }) => (isMenu ? t("Print") : t("Print template")),
  analyticsName: "Print template",
  section: ActiveTemplateSection,
  icon: <PrintIcon />,
  visible: ({ getActiveModel }) => !!getActiveModel(Template) && !!window.print,
  perform: () => {
    setTimeout(window.print, 0);
  },
});
export const rootTemplateActions = [moveTemplate, createNoteFromTemplate];
