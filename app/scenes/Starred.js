// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';

import CenteredContent from 'components/CenteredContent';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import Empty from 'components/Empty';
import PageTitle from 'components/PageTitle';
import Heading from 'components/Heading';
import DocumentList from 'components/DocumentList';
import Tabs from 'components/Tabs';
import Tab from 'components/Tab';
import NewDocumentMenu from 'menus/NewDocumentMenu';
import Actions, { Action } from 'components/Actions';
import DocumentsStore from 'stores/DocumentsStore';

type Props = {
  documents: DocumentsStore,
  match: Object,
};

@observer
class Starred extends React.Component<Props> {
  componentDidMount() {
    this.props.documents.fetchStarred();
  }

  render() {
    const {
      isLoaded,
      isFetching,
      starred,
      starredAlphabetical,
    } = this.props.documents;
    const { sort } = this.props.match.params;
    const showLoading = !isLoaded && isFetching;
    const showEmpty = isLoaded && !starred.length;

    return (
      <CenteredContent column auto>
        <PageTitle title="Starred" />
        <Heading>Starred</Heading>
        {showEmpty ? (
          <Empty>You’ve not starred any documents yet.</Empty>
        ) : (
          <React.Fragment>
            <Tabs>
              <Tab to="/starred" exact>
                Recently Updated
              </Tab>
              <Tab to="/starred/alphabetical" exact>
                Alphabetical
              </Tab>
            </Tabs>
            <DocumentList
              documents={
                sort === 'alphabetical' ? starredAlphabetical : starred
              }
              showCollection
            />
          </React.Fragment>
        )}
        {showLoading && <ListPlaceholder />}
        <Actions align="center" justify="flex-end">
          <Action>
            <NewDocumentMenu />
          </Action>
        </Actions>
      </CenteredContent>
    );
  }
}

export default inject('documents')(Starred);
