import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import type Template from "~/models/Template";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useTemplateSettingsActions } from "~/hooks/useTemplateSettingsActions";

type Props = {
  template: Template;
  onEdit?: () => void;
  /** Whether to render the trigger as a neutral button with a border on hover */
  neutral?: boolean;
};

function TemplateMenu({ template, onEdit, neutral }: Props) {
  const { t } = useTranslation();
  const rootAction = useTemplateSettingsActions(template, onEdit);

  return (
    <ActionContextProvider value={{ activeModels: [template] }}>
      <DropdownMenu
        action={rootAction}
        align="end"
        ariaLabel={t("Template options")}
      >
        <OverflowMenuButton neutral={neutral} />
      </DropdownMenu>
    </ActionContextProvider>
  );
}

export default observer(TemplateMenu);
