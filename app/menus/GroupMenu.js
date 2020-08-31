// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { withRouter, type RouterHistory } from "react-router-dom";
import PoliciesStore from "stores/PoliciesStore";
import UiStore from "stores/UiStore";
import Group from "models/Group";
import GroupDelete from "scenes/GroupDelete";
import GroupEdit from "scenes/GroupEdit";

import { DropdownMenu, DropdownMenuItem } from "components/DropdownMenu";
import Modal from "components/Modal";

type Props = {
  ui: UiStore,
  policies: PoliciesStore,
  group: Group,
  history: RouterHistory,
  onMembers: () => void,
  onOpen?: () => void,
  onClose?: () => void,
};

@observer
class GroupMenu extends React.Component<Props> {
  @observable editModalOpen: boolean = false;
  @observable deleteModalOpen: boolean = false;

  onEdit = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.editModalOpen = true;
  };

  onDelete = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.deleteModalOpen = true;
  };

  handleEditModalClose = () => {
    this.editModalOpen = false;
  };

  handleDeleteModalClose = () => {
    this.deleteModalOpen = false;
  };

  render() {
    const { policies, group, onOpen, onClose } = this.props;
    const can = policies.abilities(group.id);

    return (
      <>
        <Modal
          title="Edit group"
          onRequestClose={this.handleEditModalClose}
          isOpen={this.editModalOpen}
        >
          <GroupEdit
            group={this.props.group}
            onSubmit={this.handleEditModalClose}
          />
        </Modal>

        <Modal
          title="Delete group"
          onRequestClose={this.handleDeleteModalClose}
          isOpen={this.deleteModalOpen}
        >
          <GroupDelete
            group={this.props.group}
            onSubmit={this.handleDeleteModalClose}
          />
        </Modal>

        <DropdownMenu onOpen={onOpen} onClose={onClose}>
          {group && (
            <>
              <DropdownMenuItem onClick={this.props.onMembers}>
                Members…
              </DropdownMenuItem>

              {(can.update || can.delete) && <hr />}

              {can.update && (
                <DropdownMenuItem onClick={this.onEdit}>Edit…</DropdownMenuItem>
              )}

              {can.delete && (
                <DropdownMenuItem onClick={this.onDelete}>
                  Delete…
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenu>
      </>
    );
  }
}

export default inject("policies")(withRouter(GroupMenu));
