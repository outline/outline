// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { withRouter, type RouterHistory } from "react-router-dom";
import UiStore from "stores/UiStore";
import Group from "models/Group";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Input from "components/Input";

type Props = {
  history: RouterHistory,
  ui: UiStore,
  group: Group,
  onSubmit: () => void,
};

@observer
class GroupEdit extends React.Component<Props> {
  @observable name: string = this.props.group.name;
  @observable isSaving: boolean;

  handleSubmit = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.isSaving = true;

    try {
      await this.props.group.save({ name: this.name });
      this.props.onSubmit();
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
      <form onSubmit={this.handleSubmit}>
        <HelpText>
          You can edit the name of this group at any time, however doing so too
          often might confuse your team mates.
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

        <Button type="submit" disabled={this.isSaving || !this.name}>
          {this.isSaving ? "Saving…" : "Save"}
        </Button>
      </form>
    );
  }
}

export default inject("ui")(withRouter(GroupEdit));
