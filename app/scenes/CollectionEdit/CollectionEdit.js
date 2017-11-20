// @flow
import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import Button from 'components/Button';
import Input from 'components/Input';
import Flex from 'shared/components/Flex';
import HelpText from 'components/HelpText';
import ColorPicker from 'components/ColorPicker';
import Collection from 'models/Collection';

type Props = {
  history: Object,
  collection: Collection,
  onSubmit: () => void,
};

@observer
class CollectionEdit extends Component {
  props: Props;
  @observable name: string;
  @observable color: string = '';
  @observable isSaving: boolean;

  componentWillMount() {
    this.name = this.props.collection.name;
  }

  handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();
    this.isSaving = true;

    this.props.collection.updateData({ name: this.name, color: this.color });
    const success = await this.props.collection.save();

    if (success) {
      this.props.onSubmit();
    }

    this.isSaving = false;
  };

  handleNameChange = (ev: SyntheticInputEvent) => {
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
            You can edit a collection’s name at any time, however doing so might
            confuse your team mates.
          </HelpText>
          <Input
            type="text"
            label="Name"
            onChange={this.handleNameChange}
            value={this.name}
            required
            autoFocus
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

export default inject('collections')(withRouter(CollectionEdit));
