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
import { EditIcon } from 'outline-icons';

const MAX_DISPLAY = 6;

type Props = {
  views: ViewsStore,
  presence: DocumentPresenceStore,
  document: Document,
  currentUserId: string,
};

@observer
class AvatarWithPresence extends React.Component<{
  user: User,
  isPresent: boolean,
  isEditing: boolean,
  isCurrentUser: boolean,
  lastViewedAt: string,
}> {
  @observable isOpen: boolean = false;

  handleOpenProfile = () => {
    this.isOpen = true;
  };

  handleCloseProfile = () => {
    this.isOpen = false;
  };

  render() {
    const {
      user,
      lastViewedAt,
      isPresent,
      isEditing,
      isCurrentUser,
    } = this.props;

    return (
      <React.Fragment>
        <Tooltip
          tooltip={
            <Centered>
              <strong>{user.name}</strong> {isCurrentUser && '(You)'}
              <br />
              {isPresent
                ? isEditing ? 'currently editing' : 'currently viewing'
                : `viewed ${distanceInWordsToNow(new Date(lastViewedAt))} ago`}
            </Centered>
          }
          placement="bottom"
        >
          <AvatarWrapper isPresent={isPresent}>
            <Avatar
              src={user.avatarUrl}
              onClick={this.handleOpenProfile}
              size={32}
              icon={isEditing ? <EditIcon size={16} color="#FFF" /> : undefined}
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
    const { document, presence, views, currentUserId } = this.props;
    const documentViews = views.inDocument(document.id);
    let documentPresence = presence.get(document.id);
    documentPresence = documentPresence
      ? Array.from(documentPresence.values())
      : [];
    const presentIds = documentPresence.map(p => p.userId);
    const editingIds = documentPresence
      .filter(p => p.isEditing)
      .map(p => p.userId);

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
          const isPresent = presentIds.includes(user.id);
          const isEditing = editingIds.includes(user.id);

          return (
            <AvatarWithPresence
              key={user.id}
              user={user}
              lastViewedAt={lastViewedAt}
              isPresent={isPresent}
              isEditing={isEditing}
              isCurrentUser={currentUserId === user.id}
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
  opacity: ${props => (props.isPresent ? 1 : 0.5)};
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
