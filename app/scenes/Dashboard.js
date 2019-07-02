// @flow
import * as React from 'react';
import { capitalize } from 'lodash';
import { Switch, Route } from 'react-router-dom';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';

import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import { NewDocumentIcon } from 'outline-icons';

import AuthStore from 'stores/AuthStore';
import DocumentsStore from 'stores/DocumentsStore';
import EventsStore from 'stores/EventsStore';
import NewDocumentMenu from 'menus/NewDocumentMenu';
import Actions, { Action } from 'components/Actions';
import CenteredContent from 'components/CenteredContent';
import Flex from 'shared/components/Flex';
import Subheading from 'components/Subheading';
import Avatar from 'components/Avatar';
import PageTitle from 'components/PageTitle';
import Tabs from 'components/Tabs';
import Tab from 'components/Tab';
import PaginatedDocumentList from '../components/PaginatedDocumentList';

type Props = {
  events: EventsStore,
  documents: DocumentsStore,
  auth: AuthStore,
};

@observer
class Dashboard extends React.Component<Props> {
  componentDidMount() {
    this.props.events.fetchPage();
  }

  render() {
    const { documents, auth } = this.props;
    if (!auth.user || !auth.team) return null;
    const user = auth.user.id;

    return (
      <CenteredContent>
        <PageTitle title="Home" />
        <Flex justify="space-between">
          <Documents>
            <h1>Home</h1>
            <Tabs>
              <Tab to="/dashboard" exact>
                Recently updated
              </Tab>
              <Tab to="/dashboard/recent" exact>
                Recently viewed
              </Tab>
              <Tab to="/dashboard/created">Created by me</Tab>
            </Tabs>
            <Switch>
              <Route path="/dashboard/recent">
                <PaginatedDocumentList
                  key="recent"
                  documents={documents.recentlyViewed}
                  fetch={documents.fetchRecentlyViewed}
                  showCollection
                />
              </Route>
              <Route path="/dashboard/created">
                <PaginatedDocumentList
                  key="created"
                  documents={documents.createdByUser(user)}
                  fetch={documents.fetchOwned}
                  options={{ user }}
                  showCollection
                />
              </Route>
              <Route path="/dashboard">
                <PaginatedDocumentList
                  documents={documents.recentlyUpdated}
                  fetch={documents.fetchRecentlyUpdated}
                  showCollection
                />
              </Route>
            </Switch>
            <Actions align="center" justify="flex-end">
              <Action>
                <NewDocumentMenu label={<NewDocumentIcon />} />
              </Action>
            </Actions>
          </Documents>
          <Activity>
            <Subheading>Team Activity</Subheading>
            <Activities>
              {this.props.events.orderedData.map(event => (
                <ListItem>
                  <Flex justify="space-between" align="center">
                    <span>
                      <h4>{event.actor.name}</h4>
                      <Context>
                        {capitalize(event.toSentance())}{' '}
                        {distanceInWordsToNow(new Date(event.createdAt), {
                          addSuffix: true,
                          includeSeconds: false,
                        })}
                      </Context>
                    </span>
                    <Avatar src={event.actor.avatarUrl} size={32} />
                  </Flex>
                </ListItem>
              ))}
            </Activities>
          </Activity>
        </Flex>
      </CenteredContent>
    );
  }
}

const ListItem = styled('li')`
  margin-bottom: 1em;
`;

const Context = styled('div')`
  color: ${props => props.theme.textTertiary};
  font-size: 14px;
`;

const Documents = styled('div')`
  width: 100%;
  margin-right: 32px;
`;

const Activity = styled('div')`
  margin-top: 82px;
  min-width: 220px;
`;

const Activities = styled('ol')`
  list-style: none;
  margin: 22px 0 0 0;
  padding: 0;

  h4 {
    margin: 0;
    overflow: hidden;
    white-space: nowrap;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
`;

export default inject('documents', 'auth', 'events')(Dashboard);
