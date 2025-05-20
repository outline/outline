import { DocumentIcon } from "outline-icons";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Icon from "@shared/components/Icon";
import { TextHelper } from "@shared/utils/TextHelper";
import Document from "~/models/Document";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { MenuItem } from "~/types";

type Props = {
  /** The document to which the templates will be applied */
  document: Document;
  /** Callback to handle when a template is selected */
  onSelectTemplate?: (template: Document) => void;
};

/**
 * This hook provides a memoized list of menu items for both collection-specific
 * templates and workspace-wide templates. It filters templates based on whether
 * they are published and organizes them into appropriate sections.
 *
 * Collection-specific templates are displayed first, followed by workspace templates
 * with a separator in between (if both types exist).
 *
 * @returns An array of MenuItem objects representing templates that can be applied
 * to the current document. Returns an empty array if no callback is provided.
 */
export function useTemplateMenuItems({ document, onSelectTemplate }: Props) {
  const user = useCurrentUser();
  const { documents } = useStores();
  const { t } = useTranslation();

  const templateToMenuItem = useCallback(
    (template: Document): MenuItem => ({
      type: "button",
      title: TextHelper.replaceTemplateVariables(
        template.titleWithDefault,
        user
      ),
      icon: template.icon ? (
        <Icon value={template.icon} color={template.color ?? undefined} />
      ) : (
        <DocumentIcon />
      ),
      onClick: () => onSelectTemplate?.(template),
    }),
    [user, onSelectTemplate]
  );

  const templates = documents.templates.filter(
    (template) => template.publishedAt
  );

  const collectionItems = templates
    .filter(
      (template) =>
        !template.isWorkspaceTemplate &&
        template.collectionId === document.collectionId
    )
    .map(templateToMenuItem);

  const workspaceTemplates = templates
    .filter((tmpl) => tmpl.isWorkspaceTemplate)
    .map(templateToMenuItem);

  const workspaceItems: MenuItem[] = useMemo(
    () =>
      workspaceTemplates.length
        ? [{ type: "heading", title: t("Workspace") }, ...workspaceTemplates]
        : [],
    [t, workspaceTemplates]
  );

  if (!onSelectTemplate) {
    return [];
  }

  return collectionItems
    ? workspaceItems.length
      ? [
          ...collectionItems,
          { type: "separator" } as MenuItem,
          ...workspaceItems,
        ]
      : collectionItems
    : workspaceItems;
}
