// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import Layout from 'components/Layout';
import CenteredContent from 'components/CenteredContent';
import CollectionNewStore from './CollectionNewStore';

type Props = {
  history: Object,
};

@observer class CollectionNew extends Component {
  store: CollectionNewStore;

  constructor(props: Props) {
    super(props);
    this.store = new CollectionNewStore({ history: this.props.history });
  }

  handleSubmit = (ev: SyntheticEvent) => {
    ev.preventDefault();
    this.store.saveCollection();
  };

  handleNameChange = (ev: SyntheticInputEvent) => {
    this.store.updateName(ev.target.value);
  };

  render() {
    return (
      <Layout titleText="New Collection" loading={this.store.isSaving}>
        <CenteredContent>
          <form onSubmit={this.handleSubmit}>
            <h2>New Collection</h2>
            <input
              type="text"
              placeholder="Name"
              onChange={this.handleNameChange}
            />
            <button type="submit">Save</button>
          </form>
        </CenteredContent>
      </Layout>
    );
  }
}

export default CollectionNew;
