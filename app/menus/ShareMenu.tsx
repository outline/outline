import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Share from "~/models/Share";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import usePolicy from "~/hooks/usePolicy";
import { ActionV2Separator } from "~/actions";
import {
  copyShareUrlFactory,
  goToShareSourceFactory,
  revokeShareFactory,
} from "~/actions/definitions/shares";
import { useMenuAction } from "~/hooks/useMenuAction";

type Props = {
  share: Share;
};

function ShareMenu({ share }: Props) {
  const { t } = useTranslation();
  const can = usePolicy(share);

  const actions = React.useMemo(
    () => [
      copyShareUrlFactory({ share }),
      goToShareSourceFactory({ share }),
      ActionV2Separator,
      revokeShareFactory({ share, can }),
    ],
    [share, can]
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu
      action={rootAction}
      align="end"
      ariaLabel={t("Share options")}
    >
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(ShareMenu);
