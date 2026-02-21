import { DocumentIcon } from "outline-icons";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import Icon from "@shared/components/Icon";
import { TextHelper } from "@shared/utils/TextHelper";
import type Template from "~/models/Template";
import { ActionSeparator, createAction, createActionGroup } from "~/actions";
import { DocumentsSection } from "~/actions/sections";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import type { Action } from "~/types";
import { useComputed } from "./useComputed";

type Props = {
  /** The document to which the templates will be applied */
  documentId: string;
  /** Callback to handle when a template is selected */
  onSelectTemplate?: (template: Template) => void;
};

/**
 * This hook provides a memoized list of actions for both collection-specific
 * templates and workspace-wide templates. It filters templates based on whether
 * they are published and organizes them into appropriate sections.
 *
 * Collection-specific templates are displayed first, followed by workspace templates
 * with a separator in between (if both types exist).
 *
 * @returns An array of Action objects representing templates that can be applied
 * to the current document. Returns an empty array if no callback is provided.
 */
export function useTemplateMenuActions({
  documentId,
  onSelectTemplate,
}: Props) {
  const user = useCurrentUser();
  const { documents, templates: templatesStore } = useStores();
  const { t } = useTranslation();
  const document = documents.get(documentId);

  const templateToAction = useCallback(
    (template: Template): Action =>
      createAction({
        name: TextHelper.replaceTemplateVariables(
          template.titleWithDefault,
          user
        ),
        section: DocumentsSection,
        icon: template.icon ? (
          <Icon
            value={template.icon}
            initial={template.initial}
            color={template.color ?? undefined}
          />
        ) : (
          <DocumentIcon />
        ),
        visible: true,
        perform: () => onSelectTemplate?.(template),
      }),
    [user, onSelectTemplate]
  );

  return useComputed(() => {
    if (!onSelectTemplate) {
      return [];
    }

    const templates = templatesStore.orderedData.filter(
      (template) => template.isActive
    );

    const collectionTemplatesActions = templates
      .filter(
        (template) =>
          !template.isWorkspaceTemplate &&
          template.collectionId === document?.collectionId
      )
      .map(templateToAction);

    const workspaceTemplatesActions = templates
      .filter((tmpl) => tmpl.isWorkspaceTemplate)
      .map(templateToAction);

    if (
      !collectionTemplatesActions.length &&
      !workspaceTemplatesActions.length
    ) {
      return [];
    }

    return [
      ...collectionTemplatesActions,
      ActionSeparator,
      createActionGroup({
        name: t("Workspace"),
        actions: workspaceTemplatesActions,
      }),
    ];
  }, [document?.collectionId, templateToAction, t]);
}
