import { observer } from "mobx-react";
import { ShapesIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit/Menu";
import Document from "~/models/Document";
import Button from "~/components/Button";
import ContextMenu from "~/components/ContextMenu";
import Template from "~/components/ContextMenu/Template";
import { useTemplateMenuItems } from "~/hooks/useTemplateMenuItems";

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
  const menu = useMenuState({
    modal: true,
  });

  const items = useTemplateMenuItems({ onSelectTemplate, document });

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
