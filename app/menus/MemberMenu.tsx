import { useTranslation } from "react-i18next";
import User from "~/models/User";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useMemo } from "react";
import { createActionV2 } from "~/actions";
import { CollectionSection } from "~/actions/sections";
import { useMenuAction } from "~/hooks/useMenuAction";

type Props = {
  user: User;
  onRemove: () => void;
};

function MemberMenu({ user, onRemove }: Props) {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();

  const actions = useMemo(
    () => [
      createActionV2({
        name: currentUser.id === user.id ? t("Leave") : t("Remove"),
        section: CollectionSection,
        dangerous: true,
        perform: onRemove,
      }),
    ],
    [t, user, currentUser, onRemove]
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} ariaLabel={t("Member options")}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default MemberMenu;
