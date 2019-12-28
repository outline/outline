// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { sortBy } from 'lodash';
import styled, { withTheme } from 'styled-components';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';

import Flex from 'shared/components/Flex';
import Avatar from 'components/Avatar';
import Tooltip from 'components/Tooltip';
import Document from 'models/Document';
import User from 'models/User';
import UserProfile from 'scenes/UserProfile';
import ViewsStore from 'stores/ViewsStore';
import DocumentPresenceStore from 'stores/DocumentPresenceStore';

const MAX_DISPLAY = 6;

type Props = {
  views: ViewsStore,
  presence: DocumentPresenceStore,
  document: Document,
};

@observer
class AvatarWithPresence extends React.Component<{
  user: User,
  status: string,
  active: boolean,
}> {
  @observable isOpen: boolean = false;

  handleOpenProfile = () => {
    this.isOpen = true;
  };

  handleCloseProfile = () => {
    this.isOpen = false;
  };
  render() {
    const { user, active, status } = this.props;

    return (
      <React.Fragment>
        <Tooltip
          tooltip={
            <Centered>
              <strong>{user.name}</strong>
              <br />
              {active ? 'currently viewing' : status}
            </Centered>
          }
          placement="bottom"
        >
          <AvatarWrapper active={active}>
            <Avatar
              src={user.avatarUrl}
              onClick={this.handleOpenProfile}
              size={32}
            />
          </AvatarWrapper>
        </Tooltip>
        <UserProfile
          user={user}
          isOpen={this.isOpen}
          onRequestClose={this.handleCloseProfile}
        />
      </React.Fragment>
    );
  }
}

@observer
class Collaborators extends React.Component<Props> {
  componentDidMount() {
    this.props.views.fetchPage({ documentId: this.props.document.id });
  }

  render() {
    const { document, presence, views } = this.props;
    const documentViews = views.inDocument(document.id);
    const presentIds = presence.get(document.id);

    // only show the most recent viewers, the rest can overflow
    let mostRecentViewers = documentViews.slice(0, MAX_DISPLAY);

    // ensure currently present via websocket are always ordered first
    mostRecentViewers = sortBy(mostRecentViewers, view =>
      presentIds.includes(view.user.id)
    );

    // if there are too many to display then add a (+X) to the UI
    const overflow = documentViews.length - mostRecentViewers.length;

    return (
      <Avatars>
        {overflow > 0 && <More>+{overflow}</More>}
        {mostRecentViewers.map(({ lastViewedAt, user }) => {
          const active = presentIds.includes(user.id);

          return (
            <AvatarWithPresence
              key={user.id}
              user={user}
              active={active}
              status={
                active
                  ? 'currently viewing'
                  : `viewed ${distanceInWordsToNow(new Date(lastViewedAt))} ago`
              }
            />
          );
        })}
      </Avatars>
    );
  }
}

const Centered = styled.div`
  text-align: center;
`;

const AvatarWrapper = styled.div`
  width: 32px;
  height: 32px;
  margin-right: -8px;
  opacity: ${props => (props.active ? 1 : 0.5)};
  transition: opacity 250ms ease-in-out;

  &:first-child {
    margin-right: 0;
  }
`;

const More = styled.div`
  min-width: 30px;
  height: 24px;
  border-radius: 12px;
  background: ${props => props.theme.slate};
  color: ${props => props.theme.text};
  border: 2px solid ${props => props.theme.background};
  text-align: center;
  line-height: 20px;
  font-size: 11px;
  font-weight: 600;
`;

const Avatars = styled(Flex)`
  align-items: center;
  flex-direction: row-reverse;
  cursor: pointer;
`;

export default inject('views', 'presence')(withTheme(Collaborators));
