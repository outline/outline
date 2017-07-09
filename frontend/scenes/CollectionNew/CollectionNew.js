// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import Button from 'components/Button';
import Input from 'components/Input';
import Collection from 'models/Collection';

@observer class CollectionNew extends Component {
  static defaultProps = {
    collection: new Collection(),
  };

  handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();
    await this.props.collection.save();
  };

  handleNameChange = (ev: SyntheticInputEvent) => {
    this.props.collection.updateData({ name: ev.target.value });
  };

  handleDescriptionChange = (ev: SyntheticInputEvent) => {
    this.props.collection.updateData({ description: ev.target.value });
  };

  render() {
    const { collection } = this.props;

    return (
      <form onSubmit={this.handleSubmit}>
        {collection.errors.errors.map(error => <span>{error}</span>)}
        <Input
          type="text"
          placeholder="Name"
          onChange={this.handleNameChange}
          value={collection.name}
          autoFocus
        />
        <Input
          type="textarea"
          placeholder="Description (optional)"
          onChange={this.handleDescriptionChange}
          value={collection.description}
        />
        <Button type="submit" disabled={collection.isSaving}>
          {collection.isSaving ? 'Creating…' : 'Create'}
        </Button>
      </form>
    );
  }
}

export default CollectionNew;
