// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import ContextMenu from "components/ContextMenu";
import OverflowMenuButton from "components/ContextMenu/OverflowMenuButton";
import Template from "components/ContextMenu/Template";

type Props = {|
  onRemove: () => void,
|};

function MemberMenu({ onRemove }: Props) {
  const { t } = useTranslation();
  const menu = useMenuState({ modal: true });

  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu} aria-label={t("Member options")}>
        <Template
          {...menu}
          items={[
            {
              title: t("Remove"),
              onClick: onRemove,
            },
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default observer(MemberMenu);
