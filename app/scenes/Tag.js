// @flow
import * as React from 'react';
import { capitalize } from 'lodash';
import { observer, inject } from 'mobx-react';
import { NewDocumentIcon, HashtagIcon } from 'outline-icons';

import CenteredContent from 'components/CenteredContent';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import Empty from 'components/Empty';
import PageTitle from 'components/PageTitle';
import Heading from 'components/Heading';
import Subheading from 'components/Subheading';
import DocumentList from 'components/DocumentList';
import NewDocumentMenu from 'menus/NewDocumentMenu';
import Actions, { Action, Separator } from 'components/Actions';
import TagsStore from 'stores/TagsStore';
import DocumentsStore from 'stores/DocumentsStore';

type Props = {
  tags: TagsStore,
  documents: DocumentsStore,
};

@observer
class Tag extends React.Component<Props> {
  componentDidMount() {
    this.props.tags.fetchPage();
  }

  renderActions() {
    return (
      <Actions align="center" justify="flex-end">
        <Action>
          <NewDocumentMenu
            history={this.props.history}
            collection={this.collection}
          />
        </Action>
        <Separator />
        <Action>
          <a onClick={this.onNewDocument}>
            <NewDocumentIcon />
          </a>
        </Action>
      </Actions>
    );
  }

  render() {
    const { documents, match } = this.props;
    const { isLoaded, isFetching } = documents;
    const showLoading = !isLoaded && isFetching;
    const showEmpty = isLoaded && !documents.recentlyViewed.length;
    const tag = match.params.name;

    return (
      <CenteredContent>
        <PageTitle title={`#${tag}`} />
        <Heading>
          <HashtagIcon size={40} expanded /> {capitalize(tag)}
        </Heading>

        <Subheading>Documents</Subheading>
        <DocumentList documents={documents.recentlyViewed} limit={10} />
        {this.renderActions()}
      </CenteredContent>
    );
  }
}

export default inject('documents', 'tags')(Tag);
