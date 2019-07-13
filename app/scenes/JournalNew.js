// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import Button from 'components/Button';
import Switch from 'components/Switch';
import Input from 'components/Input';
import ColorPicker from 'components/ColorPicker';
import HelpText from 'components/HelpText';
import Flex from 'shared/components/Flex';

import Collection from 'models/Collection';
import CollectionsStore from 'stores/CollectionsStore';
import UiStore from 'stores/UiStore';

type Props = {
  history: Object,
  ui: UiStore,
  collections: CollectionsStore,
  onSubmit: () => void,
};

@observer
class JournalNew extends React.Component<Props> {
  @observable name: string = '';
  @observable color: string = '#4E5C6E';
  @observable private: boolean = false;
  @observable isSaving: boolean;

  handleSubmit = async (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    this.isSaving = true;
    const collection = new Collection(
      {
        name: this.name,
        color: this.color,
        private: this.private,
        type: 'journal',
      },
      this.props.collections
    );

    try {
      await collection.save();
      this.props.onSubmit();
      this.props.history.push(collection.url);
    } catch (err) {
      this.props.ui.showToast(err.message);
    } finally {
      this.isSaving = false;
    }
  };

  handleNameChange = (ev: SyntheticInputEvent<*>) => {
    this.name = ev.target.value;
  };

  handlePrivateChange = (ev: SyntheticInputEvent<*>) => {
    this.private = ev.target.checked;
  };

  handleColor = (color: string) => {
    this.color = color;
  };

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <HelpText>
          Journals are for chronological posts, you can think of them like an
          internal blog. Communicate announcments, initiatives, and new ideas in
          a way that is permanently referencable.
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
          &nbsp;<ColorPicker onChange={this.handleColor} value={this.color} />
        </Flex>

        <Switch
          id="private"
          label="Private journal"
          onChange={this.handlePrivateChange}
          checked={this.private}
        />
        <HelpText>
          A private journal will only be visible to invited team members.
        </HelpText>

        <Button type="submit" disabled={this.isSaving || !this.name}>
          {this.isSaving ? 'Creating…' : 'Create'}
        </Button>
      </form>
    );
  }
}

export default inject('collections', 'ui')(withRouter(JournalNew));
