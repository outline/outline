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
  PublishIcon,
  TrashIcon,
} from "outline-icons";
import { Trans } from "react-i18next";
import { toast } from "sonner";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import TemplateMove from "~/components/DocumentExplorer/TemplateMove";
import {
  createAction,
  createActionWithChildren,
  createInternalLinkAction,
} from "~/actions";
import {
  dialogActionFactory,
  everyActiveModel,
  performBatch,
  performBatchOnActiveModels,
} from "~/actions/definitions/common";
import type { ActionContext } from "~/types";
import history from "~/utils/history";
import {
  newDocumentPath,
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

export const deleteTemplate = dialogActionFactory({
  analyticsName: "Delete template",
  section: ActiveTemplateSection,
  name: (t) => `${t("Delete")}…`,
  title: (t, { getActiveModels }) =>
    getActiveModels(Template).length === 1
      ? t("Delete template")
      : t("Delete {{ count }} template", {
          count: getActiveModels(Template).length,
        }),
  content: (onSubmit, { getActiveModels, t }) => {
    const templates = getActiveModels(Template);

    return (
      <ConfirmationDialog
        onSubmit={async () => {
          await performBatch(templates, (template) => template.delete());
          onSubmit();
          history.push(settingsPath("templates"));
          toast.success(
            templates.length === 1
              ? t("Template deleted")
              : t("{{ count }} template deleted", { count: templates.length })
          );
        }}
        savingText={`${t("Deleting")}…`}
        danger
      >
        {templates.length === 1 ? (
          <Trans
            defaults="Are you sure about that? Deleting the <em>{{ templateName }}</em> template is permanent."
            values={{
              templateName: templates[0].titleWithDefault,
            }}
            components={{
              em: <strong />,
            }}
          />
        ) : (
          t(
            "Are you sure about that? Deleting {{ count }} template is permanent.",
            { count: templates.length }
          )
        )}
      </ConfirmationDialog>
    );
  },
  icon: <TrashIcon />,
  dangerous: true,
  visible: (context) =>
    everyActiveModel(
      context,
      Template,
      (template) => context.stores.policies.abilities(template.id).delete
    ),
});

export const publishTemplate = createAction({
  name: ({ t }) => t("Publish"),
  analyticsName: "Publish template",
  section: ActiveTemplateSection,
  icon: <PublishIcon />,
  visible: (context) =>
    everyActiveModel(
      context,
      Template,
      (template) =>
        template.isDraft &&
        context.stores.policies.abilities(template.id).update
    ),
  perform: async (context) => {
    const templates = context.getActiveModels(Template);

    if (
      templates.some(
        (template) =>
          !template.data || ProsemirrorDataHelper.isEmpty(template.data)
      )
    ) {
      toast.message(context.t("A template must have content"));
      return;
    }

    const succeeded = await performBatchOnActiveModels(
      context,
      Template,
      (template) => template.publish(),
      (models, count, t) =>
        models.length === 1
          ? t("Template published")
          : t("{{ count }} template published", { count })
    );

    if (succeeded < templates.length) {
      toast.error(
        context.t("Could not publish {{ count }} template", {
          count: templates.length - succeeded,
        })
      );
    }
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
  visible: (context) => !!singleActiveTemplate(context)?.collectionId,
  perform: async (context) => {
    const { stores, t } = context;
    const template = singleActiveTemplate(context);
    if (!template) {
      return;
    }

    try {
      await template.save({ collectionId: null });
      toast.success(t("Template moved"));
      stores.dialogs.closeAllModals();
    } catch (_err) {
      toast.error(t("Couldn't move the template, try again?"));
    }
  },
});

export const moveTemplateToCollection = createAction({
  name: ({ t }) => t("Move to collection"),
  analyticsName: "Move template to collection",
  section: ActiveTemplateSection,
  icon: <CollectionIcon />,
  visible: (context) => !!singleActiveTemplate(context),
  perform: (context) => {
    const { stores, t } = context;
    const template = singleActiveTemplate(context);
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
  visible: (context) => {
    const template = singleActiveTemplate(context);
    return !!template && context.stores.policies.abilities(template.id).move;
  },
  children: [moveTemplateToWorkspace, moveTemplateToCollection],
});

export const createDocumentFromTemplate = createInternalLinkAction({
  name: ({ t }) => t("New document"),
  analyticsName: "New document from template",
  section: ActiveTemplateSection,
  icon: <NewDocumentIcon />,
  keywords: "create",
  visible: (context) => {
    const { currentTeamId, stores } = context;
    const template = singleActiveTemplate(context);
    if (!template || !currentTeamId) {
      return false;
    }

    if (template.collectionId) {
      return !!stores.policies.abilities(template.collectionId).createDocument;
    }
    return !!stores.policies.abilities(currentTeamId).createDocument;
  },
  to: (context) => {
    const { activeCollectionId, sidebarContext } = context;
    const template = singleActiveTemplate(context);
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

export const duplicateTemplate = createAction({
  name: ({ t }) => t("Duplicate"),
  analyticsName: "Duplicate template",
  section: ActiveTemplateSection,
  icon: <DuplicateIcon />,
  keywords: "copy",
  visible: (context) =>
    everyActiveModel(
      context,
      Template,
      (template) => context.stores.policies.abilities(template.id).duplicate
    ),
  perform: (context) =>
    performBatchOnActiveModels(
      context,
      Template,
      (template) => context.stores.templates.duplicate(template),
      (templates, succeeded, t) =>
        templates.length === 1
          ? undefined
          : t("{{ count }} template duplicated", { count: succeeded })
    ),
});

export const copyTemplateLink = createAction({
  name: ({ t }) => t("Copy link"),
  analyticsName: "Copy template link",
  section: ActiveTemplateSection,
  icon: <CopyIcon />,
  iconInContextMenu: false,
  visible: (context) => !!singleActiveTemplate(context),
  perform: (context) => {
    const template = singleActiveTemplate(context);
    if (template) {
      copy(urlify(template.path));
      toast.success(context.t("Link copied to clipboard"));
    }
  },
});

export const copyTemplateAsPlainText = createAction({
  name: ({ t }) => t("Copy as text"),
  analyticsName: "Copy template as text",
  section: ActiveTemplateSection,
  icon: <CaseSensitiveIcon />,
  iconInContextMenu: false,
  visible: (context) => !!singleActiveTemplate(context),
  perform: (context) => {
    const template = singleActiveTemplate(context);
    if (template) {
      copy(ProsemirrorHelper.toPlainText(template));
      toast.success(context.t("Text copied to clipboard"));
    }
  },
});

export const copyTemplate = createActionWithChildren({
  name: ({ t }) => t("Copy"),
  analyticsName: "Copy template",
  section: ActiveTemplateSection,
  icon: <CopyIcon />,
  keywords: "clipboard",
  visible: (context) => !!singleActiveTemplate(context),
  children: [copyTemplateLink, copyTemplateAsPlainText],
});

export const printTemplate = createAction({
  name: ({ t, isMenu }) => (isMenu ? t("Print") : t("Print template")),
  analyticsName: "Print template",
  section: ActiveTemplateSection,
  icon: <PrintIcon />,
  visible: (context) => !!singleActiveTemplate(context) && !!window.print,
  perform: () => {
    setTimeout(window.print, 0);
  },
});

export const rootTemplateActions = [
  createTemplate,
  publishTemplate,
  duplicateTemplate,
  moveTemplate,
  createDocumentFromTemplate,
  copyTemplate,
  printTemplate,
  deleteTemplate,
];

/** The active template, when a single one is active. */
const singleActiveTemplate = ({ getActiveModels }: ActionContext) => {
  const templates = getActiveModels(Template);
  return templates.length === 1 ? templates[0] : undefined;
};
