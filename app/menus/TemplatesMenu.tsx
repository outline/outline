import { observer } from "mobx-react";
import { ShapesIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import type Document from "~/models/Document";
import Button from "~/components/Button";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { useMenuAction } from "~/hooks/useMenuAction";
import { useTemplateMenuActions } from "~/hooks/useTemplateMenuActions";

type Props = {
  /** The document to which the templates will be applied */
  document: Document;
  /** Whether to render the button as a compact icon */
  isCompact?: boolean;
  /** Callback to handle when a template is selected */
  onSelectTemplate: (template: Document) => void;
};

function TemplatesMenu({ isCompact, onSelectTemplate, document }: Props) {
  const { t } = useTranslation();
  const allActions = useTemplateMenuActions({
    onSelectTemplate,
    documentId: document.id,
  });
  const rootAction = useMenuAction(allActions);

  if (!allActions.length) {
    return null;
  }

  return (
    <DropdownMenu action={rootAction} align="start" ariaLabel={t("Templates")}>
      <Button
        icon={isCompact ? <ShapesIcon /> : undefined}
        disclosure={!isCompact}
        neutral
      >
        {isCompact ? undefined : t("Templates")}
      </Button>
    </DropdownMenu>
  );
}

export default observer(TemplatesMenu);
