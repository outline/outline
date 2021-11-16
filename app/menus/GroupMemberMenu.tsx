import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import ContextMenu from "components/ContextMenu";
import OverflowMenuButton from "components/ContextMenu/OverflowMenuButton";
import Template from "components/ContextMenu/Template";

type Props = {
  onRemove: () => void;
};

function GroupMemberMenu({ onRemove }: Props) {
  const { t } = useTranslation();
  const menu = useMenuState({
    modal: true,
  });
  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      // @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: Element; "aria-label": string; b... Remove this comment to see the full error message
      <ContextMenu {...menu} aria-label={t("Group member options")}>
        // @ts-expect-error ts-migrate(2741) FIXME: Property 'actions' is missing in type '{ items: { ... Remove this comment to see the full error message
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

export default observer(GroupMemberMenu);
