// @flow
import * as React from 'react';
import { inject } from 'mobx-react';
import type { RouterHistory, Location } from 'react-router-dom';
import Flex from 'shared/components/Flex';
import CenteredContent from 'components/CenteredContent';
import LoadingPlaceholder from 'components/LoadingPlaceholder';
import DocumentsStore from 'stores/DocumentsStore';
import UiStore from 'stores/UiStore';
import { documentEditUrl } from 'utils/routeHelpers';

type Props = {
  history: RouterHistory,
  location: Location,
  documents: DocumentsStore,
  ui: UiStore,
  match: Object,
};

class DocumentNew extends React.Component<Props> {
  async componentDidMount() {
    try {
      const document = await this.props.documents.create({
        collectionId: this.props.match.params.id,
        parentDocumentId: new URLSearchParams(this.props.location.search).get(
          'parentDocumentId'
        ),
        title: '',
        text: '',
      });
      this.props.history.replace(documentEditUrl(document));
    } catch (err) {
      this.props.ui.showToast('Couldn’t create the document, try again?');
      this.props.history.goBack();
    }
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

export default inject('documents', 'ui')(DocumentNew);
