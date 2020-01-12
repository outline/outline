// @flow
import * as React from 'react';
import { withRouter, type RouterHistory } from 'react-router-dom';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import Button from 'components/Button';
import Input from 'components/Input';
import HelpText from 'components/HelpText';
import Flex from 'shared/components/Flex';

import Group from 'models/Group';
import GroupsStore from 'stores/GroupsStore';
import UiStore from 'stores/UiStore';

type Props = {
  history: RouterHistory,
  ui: UiStore,
  groups: GroupsStore,
  onSubmit: () => void,
};

@observer
class GroupNew extends React.Component<Props> {
  @observable name: string = '';
  @observable isSaving: boolean;

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
      await group.save();
      this.props.onSubmit();
      this.props.history.push(group.url);
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
          Groups help you organize users into logical... groups.
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
        <HelpText>You can add users after the group is created</HelpText>

        <Button type="submit" disabled={this.isSaving || !this.name}>
          {this.isSaving ? 'Creating…' : 'Create'}
        </Button>
      </form>
    );
  }
}

export default inject('groups', 'ui')(withRouter(GroupNew));
