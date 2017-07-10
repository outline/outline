// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import Button from 'components/Button';
import Input from 'components/Input';
import HelpText from 'components/HelpText';

import Collection from 'models/Collection';
import CollectionsStore from 'stores/CollectionsStore';

@observer class CollectionNew extends Component {
  props: {
    history: Object,
    collection: Collection,
    collections: CollectionsStore,
    onCollectionCreated: () => void,
  };
  state: { name: string, isSaving: boolean };
  state = { name: '', isSaving: false };

  static defaultProps = {
    collection: new Collection(),
  };

  handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();
    this.setState({ isSaving: true });
    const { collection, collections } = this.props;

    collection.updateData(this.state);
    await collection.save();
    collections.add(collection);

    this.setState({ isSaving: false });
    this.props.onCollectionCreated();
    this.props.history.push(collection.url);
  };

  handleNameChange = (ev: SyntheticInputEvent) => {
    this.setState({ name: ev.target.value });
  };

  render() {
    const { collection } = this.props;

    return (
      <form onSubmit={this.handleSubmit}>
        {collection.errors.errors.map(error => <span>{error}</span>)}
        <HelpText>
          Collections are for grouping your Atlas. They work best when organized
          around a topic or internal team — Product or Engineering for example.
        </HelpText>
        <Input
          type="text"
          label="Name"
          onChange={this.handleNameChange}
          value={this.state.name}
          required
          autoFocus
        />
        <Button
          type="submit"
          disabled={this.state.isSaving || !this.state.name}
        >
          {this.state.isSaving ? 'Creating…' : 'Create'}
        </Button>
      </form>
    );
  }
}

export default CollectionNew;
