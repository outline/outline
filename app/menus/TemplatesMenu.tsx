import { observer } from "mobx-react";
import { DocumentIcon, ShapesIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit/Menu";
import Icon from "@shared/components/Icon";
import { TextHelper } from "@shared/utils/TextHelper";
import Document from "~/models/Document";
import Button from "~/components/Button";
import ContextMenu from "~/components/ContextMenu";
import Template from "~/components/ContextMenu/Template";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { MenuItem } from "~/types";

type Props = {
  /** The document to which the templates will be applied */
  document: Document;
  /** Whether to render the button as a compact icon */
  isCompact?: boolean;
  /** Callback to handle when a template is selected */
  onSelectTemplate: (template: Document) => void;
};

function TemplatesMenu({ isCompact, onSelectTemplate, document }: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const user = useCurrentUser();
  const { documents } = useStores();
  const { t } = useTranslation();

  const templateToMenuItem = React.useCallback(
    (tmpl: Document): MenuItem => ({
      type: "button",
      title: TextHelper.replaceTemplateVariables(tmpl.titleWithDefault, user),
      icon: tmpl.icon ? (
        <Icon value={tmpl.icon} color={tmpl.color ?? undefined} />
      ) : (
        <DocumentIcon />
      ),
      onClick: () => onSelectTemplate(tmpl),
    }),
    [user, onSelectTemplate]
  );

  const templates = documents.templates.filter((tmpl) => tmpl.publishedAt);

  const collectionItems = templates
    .filter(
      (tmpl) =>
        !tmpl.isWorkspaceTemplate && tmpl.collectionId === document.collectionId
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

  const items = collectionItems
    ? workspaceItems.length
      ? [
          ...collectionItems,
          { type: "separator" } as MenuItem,
          ...workspaceItems,
        ]
      : collectionItems
    : workspaceItems;

  if (!items.length) {
    return null;
  }

  return (
    <>
      <MenuButton {...menu}>
        {(props) => (
          <Button
            {...props}
            icon={isCompact ? <ShapesIcon /> : undefined}
            disclosure={!isCompact}
            neutral
          >
            {isCompact ? undefined : t("Templates")}
          </Button>
        )}
      </MenuButton>
      <ContextMenu {...menu} aria-label={t("Templates")}>
        <Template {...menu} items={items} />
      </ContextMenu>
    </>
  );
}

export default observer(TemplatesMenu);
