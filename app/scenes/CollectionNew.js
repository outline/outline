// @flow
import * as React from 'react';
import { withRouter, type RouterHistory } from 'react-router-dom';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import Button from 'components/Button';
import Switch from 'components/Switch';
import Input from 'components/Input';
import InputRich from 'components/InputRich';
import ColorPicker from 'components/ColorPicker';
import HelpText from 'components/HelpText';
import Flex from 'shared/components/Flex';

import Collection from 'models/Collection';
import CollectionsStore from 'stores/CollectionsStore';
import UiStore from 'stores/UiStore';

type Props = {
  history: RouterHistory,
  ui: UiStore,
  collections: CollectionsStore,
  onSubmit: () => void,
};

@observer
class CollectionNew extends React.Component<Props> {
  @observable name: string = '';
  @observable description: string = '';
  @observable color: string = '#4E5C6E';
  @observable private: boolean = false;
  @observable isSaving: boolean;

  handleSubmit = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.isSaving = true;
    const collection = new Collection(
      {
        name: this.name,
        description: this.description,
        color: this.color,
        private: this.private,
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

  handleDescriptionChange = getValue => {
    this.description = getValue();
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
          Collections are for grouping your knowledge base. They work best when
          organized around a topic or internal team — Product or Engineering for
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
          &nbsp;<ColorPicker onChange={this.handleColor} value={this.color} />
        </Flex>
        <InputRich
          label="Description"
          onChange={this.handleDescriptionChange}
          defaultValue={this.description || ''}
          placeholder="More details about this collection…"
          minHeight={68}
          maxHeight={200}
        />
        <Switch
          id="private"
          label="Private collection"
          onChange={this.handlePrivateChange}
          checked={this.private}
        />
        <HelpText>
          A private collection will only be visible to invited team members.
        </HelpText>

        <Button type="submit" disabled={this.isSaving || !this.name}>
          {this.isSaving ? 'Creating…' : 'Create'}
        </Button>
      </form>
    );
  }
}

export default inject('collections', 'ui')(withRouter(CollectionNew));
