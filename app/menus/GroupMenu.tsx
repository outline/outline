import { observer } from "mobx-react";
import { EditIcon, GroupIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import Group from "~/models/Group";
import GroupDelete from "~/scenes/GroupDelete";
import GroupEdit from "~/scenes/GroupEdit";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import Modal from "~/components/Modal";
import usePolicy from "~/hooks/usePolicy";

type Props = {
  group: Group;
  onMembers: () => void;
};

function GroupMenu({ group, onMembers }: Props) {
  const { t } = useTranslation();
  const menu = useMenuState({
    modal: true,
  });
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const can = usePolicy(group);

  return (
    <>
      <Modal
        title={t("Edit group")}
        onRequestClose={() => setEditModalOpen(false)}
        isOpen={editModalOpen}
      >
        <GroupEdit group={group} onSubmit={() => setEditModalOpen(false)} />
      </Modal>
      <Modal
        title={t("Delete group")}
        onRequestClose={() => setDeleteModalOpen(false)}
        isOpen={deleteModalOpen}
      >
        <GroupDelete group={group} onSubmit={() => setDeleteModalOpen(false)} />
      </Modal>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu} aria-label={t("Group options")}>
        <Template
          {...menu}
          items={[
            {
              type: "button",
              title: `${t("Members")}…`,
              icon: <GroupIcon />,
              onClick: onMembers,
              visible: !!(group && can.read),
            },
            {
              type: "separator",
            },
            {
              type: "button",
              title: `${t("Edit")}…`,
              icon: <EditIcon />,
              onClick: () => setEditModalOpen(true),
              visible: !!(group && can.update),
            },
            {
              type: "button",
              title: `${t("Delete")}…`,
              icon: <TrashIcon />,
              dangerous: true,
              onClick: () => setDeleteModalOpen(true),
              visible: !!(group && can.delete),
            },
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default observer(GroupMenu);
