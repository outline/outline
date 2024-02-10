import { observer } from "mobx-react";
import { QuestionMarkIcon, UserIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "reakit";
import { useTheme } from "styled-components";
import { CollectionPermission } from "@shared/types";
import Collection from "~/models/Collection";
import Share from "~/models/Share";
import { AvatarSize } from "~/components/Avatar/Avatar";
import Flex from "~/components/Flex";
import InputSelectPermission from "~/components/InputSelectPermission";
import { StyledListItem } from "~/components/Sharing/MemberListItem";
import Squircle from "~/components/Squircle";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";

type Props = {
  collection: Collection;
  /** The existing share model, if any. */
  share: Share | null | undefined;
  /** Callback fired when the popover requests to be closed. */
  onRequestClose: () => void;
  /** Whether the popover is visible. */
  visible: boolean;
};

function SharePopover({ collection }: Props) {
  const team = useCurrentTeam();
  const theme = useTheme();
  const { t } = useTranslation();
  const can = usePolicy(collection);
  //

  return (
    <div>
      <StyledListItem
        image={
          <Squircle color={theme.accent} size={AvatarSize.Medium}>
            <UserIcon color={theme.accentText} size={16} />
          </Squircle>
        }
        title={t("All members")}
        subtitle={t("Everyone in the workspace")}
        actions={
          <InputSelectPermission
            value={collection?.permission}
            labelHidden
            nude
          />
        }
      />
    </div>
  );
}

export default observer(SharePopover);
