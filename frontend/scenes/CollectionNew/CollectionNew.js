// @flow
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import Button from 'components/Button';
import Input from 'components/Input';
import HelpText from 'components/HelpText';

import Collection from 'models/Collection';
import CollectionsStore from 'stores/CollectionsStore';

type Props = {
  history: Object,
  collections: CollectionsStore,
  onCollectionCreated: () => void,
};

@observer class CollectionNew extends Component {
  props: Props;
  @observable collection: Collection;
  @observable name: string = '';
  @observable isSaving: boolean;

  constructor(props: Props) {
    super(props);
    this.collection = new Collection();
  }

  handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();
    this.isSaving = true;
    this.collection.updateData({ name: this.name });
    const success = await this.collection.save();

    if (success) {
      this.props.collections.add(this.collection);
      this.props.onCollectionCreated();
      this.props.history.push(this.collection.url);
    }

    this.isSaving = false;
  };

  handleNameChange = (ev: SyntheticInputEvent) => {
    this.name = ev.target.value;
  };

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        {this.collection.errors.errors.map(error => <span>{error}</span>)}
        <HelpText>
          Collections are for grouping your Atlas. They work best when organized
          around a topic or internal team — Product or Engineering for example.
        </HelpText>
        <Input
          type="text"
          label="Name"
          onChange={this.handleNameChange}
          value={this.name}
          required
          autoFocus
        />
        <Button type="submit" disabled={this.isSaving || !this.name} primary>
          {this.isSaving ? 'Creating…' : 'Create'}
        </Button>
      </form>
    );
  }
}

export default CollectionNew;
