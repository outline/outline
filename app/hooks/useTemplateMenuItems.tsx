import { DocumentIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Icon from "@shared/components/Icon";
import { TextHelper } from "@shared/utils/TextHelper";
import Document from "~/models/Document";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { MenuItem } from "~/types";

export function useTemplateMenuItems({
  document,
  onSelectTemplate,
}: {
  /** The document to which the templates will be applied */
  document: Document;
  /** Callback to handle when a template is selected */
  onSelectTemplate?: (template: Document) => void;
}) {
  const user = useCurrentUser();
  const { documents } = useStores();
  const { t } = useTranslation();

  const templateToMenuItem = React.useCallback(
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

  const workspaceItems: MenuItem[] = React.useMemo(
    () =>
      workspaceTemplates.length
        ? [{ type: "heading", title: t("Workspace") }, ...workspaceTemplates]
        : [],
    [t, workspaceTemplates]
  );

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
