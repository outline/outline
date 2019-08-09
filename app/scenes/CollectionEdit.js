// @flow
import * as React from 'react';
import { withRouter, type RouterHistory } from 'react-router-dom';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import Input from 'components/Input';
import InputRich from 'components/InputRich';
import Button from 'components/Button';
import Flex from 'shared/components/Flex';
import HelpText from 'components/HelpText';
import ColorPicker from 'components/ColorPicker';
import Collection from 'models/Collection';
import UiStore from 'stores/UiStore';

type Props = {
  history: RouterHistory,
  collection: Collection,
  ui: UiStore,
  onSubmit: () => void,
};

@observer
class CollectionEdit extends React.Component<Props> {
  @observable name: string;
  @observable description: string = '';
  @observable color: string = '';
  @observable isSaving: boolean;

  componentWillMount() {
    this.name = this.props.collection.name;
    this.description = this.props.collection.description;
  }

  handleSubmit = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.isSaving = true;

    try {
      await this.props.collection.save({
        name: this.name,
        description: this.description,
        color: this.color,
      });
      this.props.onSubmit();
    } catch (err) {
      this.props.ui.showToast(err.message);
    } finally {
      this.isSaving = false;
    }
  };

  handleDescriptionChange = getValue => {
    this.description = getValue();
  };

  handleNameChange = (ev: SyntheticInputEvent<*>) => {
    this.name = ev.target.value;
  };

  handleColor = (color: string) => {
    this.color = color;
  };

  render() {
    return (
      <Flex column>
        <form onSubmit={this.handleSubmit}>
          <HelpText>
            You can edit a collection’s name and other details at any time,
            however doing so often might confuse your team mates.
          </HelpText>
          <Input
            type="text"
            label="Name"
            onChange={this.handleNameChange}
            value={this.name}
            required
            autoFocus
          />
          <InputRich
            id={this.props.collection.id}
            label="Description"
            onChange={this.handleDescriptionChange}
            defaultValue={this.description || ''}
            placeholder="More details about this collection…"
            minHeight={68}
            maxHeight={200}
          />
          <ColorPicker
            onSelect={this.handleColor}
            value={this.props.collection.color}
          />
          <Button
            type="submit"
            disabled={this.isSaving || !this.props.collection.name}
          >
            {this.isSaving ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </Flex>
    );
  }
}

export default inject('ui')(withRouter(CollectionEdit));
