// @flow
import React, { Component } from 'react';
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

class CollectionNew extends Component {
  props: Props;
  state: { collection: Collection, name: string, isSaving: boolean };

  constructor(props: Props) {
    super(props);

    this.state = {
      name: '',
      isSaving: false,
      collection: new Collection(),
    };
  }

  handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();
    this.setState({ isSaving: true });
    const { collection } = this.state;
    const { collections } = this.props;

    collection.updateData(this.state);
    const success = await collection.save();

    if (success) {
      collections.add(collection);
      this.props.onCollectionCreated();
      this.props.history.push(collection.url);
    }

    this.setState({ isSaving: false });
  };

  handleNameChange = (ev: SyntheticInputEvent) => {
    this.setState({ name: ev.target.value });
  };

  render() {
    const { collection } = this.state;

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
