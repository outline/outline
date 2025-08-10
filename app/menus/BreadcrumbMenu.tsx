import { useTranslation } from "react-i18next";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { useMenuAction } from "~/hooks/useMenuAction";
import { InternalLinkActionV2 } from "~/types";

type Props = {
  actions: InternalLinkActionV2[];
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
