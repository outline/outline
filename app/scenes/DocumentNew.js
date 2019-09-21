// @flow
import * as React from 'react';
import { inject } from 'mobx-react';
import Flex from 'shared/components/Flex';
import CenteredContent from 'components/CenteredContent';
import LoadingPlaceholder from 'scenes/Document/components/LoadingPlaceholder';
import DocumentsStore from 'stores/DocumentsStore';
import { documentEditUrl } from 'utils/routeHelpers';

type Props = {
  documents: DocumentsStore,
  match: Object,
};

class DocumentNew extends React.Component<Props> {
  async componentDidMount() {
    const document = await this.props.documents.create({
      collectionId: this.props.match.params.id,
      parentDocumentId: new URLSearchParams(this.props.location.search).get(
        'parentDocumentId'
      ),
      title: '',
      text: '',
    });
    this.props.history.replace(documentEditUrl(document));
  }

  render() {
    return (
      <Flex column auto>
        <CenteredContent>
          <LoadingPlaceholder />
        </CenteredContent>
      </Flex>
    );
  }
}

export default inject('documents')(DocumentNew);
