import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import type Tag from "~/models/Tag";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { useTagMenuActions } from "~/hooks/useTagMenuActions";

type Props = {
  tag: Tag;
};

function TagMenu({ tag }: Props) {
  const { t } = useTranslation();
  const rootAction = useTagMenuActions(tag);

  return (
    <DropdownMenu action={rootAction} align="end" ariaLabel={t("Tag options")}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(TagMenu);
