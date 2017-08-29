// @flow
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { homeUrl } from 'utils/routeHelpers';
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
  @observable isConfirming: boolean;
  @observable isDeleting: boolean;
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

  confirmDelete = () => {
    this.isConfirming = true;
  };

  cancelDelete = () => {
    this.isConfirming = false;
  };

  confirmedDelete = async (ev: SyntheticEvent) => {
    ev.preventDefault();
    this.isDeleting = true;
    const success = await this.props.collection.delete();

    if (success) {
      this.props.collections.remove(this.props.collection.id);
      this.props.history.push(homeUrl());
      this.props.onSubmit();
    }

    this.isDeleting = false;
  };

  render() {
    return (
      <Flex column>
        <form onSubmit={this.handleSubmit}>
          <HelpText>
            You can edit a collection name at any time, but doing so might
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
        <hr />
        <form>
          <HelpText>
            Deleting a collection will also delete all of the documents within
            it, so be careful with that.
          </HelpText>
          {!this.isConfirming &&
            <Button type="submit" onClick={this.confirmDelete} neutral>
              Delete…
            </Button>}
          {this.isConfirming &&
            <span>
              <Button type="submit" onClick={this.cancelDelete} neutral>
                Cancel
              </Button>
              <Button type="submit" onClick={this.confirmedDelete} danger>
                {this.isDeleting ? 'Deleting…' : 'Confirm Delete'}
              </Button>
            </span>}
        </form>
      </Flex>
    );
  }
}

export default CollectionEdit;
