// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { withRouter, type RouterHistory } from "react-router-dom";
import GroupsStore from "stores/GroupsStore";
import UiStore from "stores/UiStore";
import Group from "models/Group";
import GroupMembers from "scenes/GroupMembers";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Input from "components/Input";
import Modal from "components/Modal";

type Props = {
  history: RouterHistory,
  ui: UiStore,
  groups: GroupsStore,
  onSubmit: () => void,
};

@observer
class GroupNew extends React.Component<Props> {
  @observable name: string = "";
  @observable isSaving: boolean;
  @observable group: Group;

  handleSubmit = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.isSaving = true;
    const group = new Group(
      {
        name: this.name,
      },
      this.props.groups
    );

    try {
      this.group = await group.save();
    } catch (err) {
      this.props.ui.showToast(err.message);
    } finally {
      this.isSaving = false;
    }
  };

  handleNameChange = (ev: SyntheticInputEvent<*>) => {
    this.name = ev.target.value;
  };

  render() {
    return (
      <>
        <form onSubmit={this.handleSubmit}>
          <HelpText>
            Groups are for organizing your team. They work best when centered
            around a function or a responsibility — Support or Engineering for
            example.
          </HelpText>
          <Flex>
            <Input
              type="text"
              label="Name"
              onChange={this.handleNameChange}
              value={this.name}
              required
              autoFocus
              flex
            />
          </Flex>
          <HelpText>You’ll be able to add people to the group next.</HelpText>

          <Button type="submit" disabled={this.isSaving || !this.name}>
            {this.isSaving ? "Creating…" : "Continue"}
          </Button>
        </form>
        <Modal
          title="Group members"
          onRequestClose={this.props.onSubmit}
          isOpen={!!this.group}
        >
          <GroupMembers group={this.group} />
        </Modal>
      </>
    );
  }
}

export default inject("groups", "ui")(withRouter(GroupNew));
