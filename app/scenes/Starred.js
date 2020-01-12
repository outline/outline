// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';

import CenteredContent from 'components/CenteredContent';
import Empty from 'components/Empty';
import PageTitle from 'components/PageTitle';
import Heading from 'components/Heading';
import PaginatedDocumentList from 'components/PaginatedDocumentList';
import InputSearch from 'components/InputSearch';
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
  render() {
    const { fetchStarred, starred, starredAlphabetical } = this.props.documents;
    const { sort } = this.props.match.params;

    return (
      <CenteredContent column auto>
        <PageTitle title="Starred" />
        <Heading>Starred</Heading>
        <PaginatedDocumentList
          heading={
            <Tabs>
              <Tab to="/starred" exact>
                Recently Updated
              </Tab>
              <Tab to="/starred/alphabetical" exact>
                Alphabetical
              </Tab>
            </Tabs>
          }
          empty={<Empty>You’ve not starred any documents yet.</Empty>}
          fetch={fetchStarred}
          documents={sort === 'alphabetical' ? starredAlphabetical : starred}
          showCollection
        />

        <Actions align="center" justify="flex-end">
          <Action>
            <InputSearch />
          </Action>
          <Action>
            <NewDocumentMenu />
          </Action>
        </Actions>
      </CenteredContent>
    );
  }
}

export default inject('documents')(Starred);
