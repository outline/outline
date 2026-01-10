import { useTranslation } from "react-i18next";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { useMenuAction } from "~/hooks/useMenuAction";
import type { InternalLinkAction } from "~/types";

type Props = {
  actions: InternalLinkAction[];
};

export default function BreadcrumbMenu({ actions }: Props) {
  const { t } = useTranslation();

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} ariaLabel={t("Show path to document")}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}
