// @flow
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { homeUrl } from 'utils/routeHelpers';
import Button from 'components/Button';
import Flex from 'components/Flex';
import HelpText from 'components/HelpText';
import Document from 'models/Document';
import DocumentsStore from 'stores/DocumentsStore';

type Props = {
  history: Object,
  document: Document,
  documents: DocumentsStore,
  onSubmit: () => void,
};

@observer class DocumentDelete extends Component {
  props: Props;
  @observable isDeleting: boolean;

  handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();
    this.isDeleting = true;
    const success = await this.props.document.delete();

    if (success) {
      this.props.documents.remove(this.props.document.id);
      this.props.history.push(homeUrl());
      this.props.onSubmit();
    }

    this.isDeleting = false;
  };

  render() {
    const { document } = this.props;

    return (
      <Flex column>
        <form onSubmit={this.handleSubmit}>
          <HelpText>
            Are you sure? Deleting the
            {' '}
            <strong>{document.title}</strong>
            {' '}
            document is permanant and will also delete all of its history.
          </HelpText>
          <Button type="submit" danger>
            {this.isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </form>
      </Flex>
    );
  }
}

export default DocumentDelete;
