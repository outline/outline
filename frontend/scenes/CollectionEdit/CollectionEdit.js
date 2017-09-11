// @flow
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import Button from 'components/Button';
import Input from 'components/Input';
import Flex from 'components/Flex';
import HelpText from 'components/HelpText';
import Collection from 'models/Collection';
import CollectionsStore from 'stores/CollectionsStore';

type Props = {
  history: Object,
  collection: Collection,
  collections: CollectionsStore,
  onSubmit: () => void,
};

@observer class CollectionEdit extends Component {
  props: Props;
  @observable name: string;
  @observable isSaving: boolean;

  componentWillMount() {
    this.name = this.props.collection.name;
  }

  handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();
    this.isSaving = true;

    this.props.collection.updateData({ name: this.name });
    const success = await this.props.collection.save();

    if (success) {
      this.props.onSubmit();
    }

    this.isSaving = false;
  };

  handleNameChange = (ev: SyntheticInputEvent) => {
    this.name = ev.target.value;
  };

  render() {
    return (
      <Flex column>
        <form onSubmit={this.handleSubmit}>
          <HelpText>
            You can edit a collection's name at any time, however doing so might
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

export default CollectionEdit;
