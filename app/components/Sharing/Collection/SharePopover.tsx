import { observer } from "mobx-react";
import { UserIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import Squircle from "@shared/components/Squircle";
import Collection from "~/models/Collection";
import Share from "~/models/Share";
import { AvatarSize } from "~/components/Avatar/Avatar";
import InputSelectPermission from "~/components/InputSelectPermission";
import usePolicy from "~/hooks/usePolicy";
import { ListItem } from "../components/ListItem";

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
  const theme = useTheme();
  const { t } = useTranslation();
  const can = usePolicy(collection);
  //

  return (
    <div>
      <ListItem
        image={
          <Squircle color={theme.accent} size={AvatarSize.Medium}>
            <UserIcon color={theme.accentText} size={16} />
          </Squircle>
        }
        title={t("All members")}
        subtitle={t("Everyone in the workspace")}
        actions={
          <InputSelectPermission
            style={{ margin: 0 }}
            onChange={(permission) => {
              void collection.save({ permission });
            }}
            disabled={!can.update}
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
