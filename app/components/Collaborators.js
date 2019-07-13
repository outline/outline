// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { filter } from 'lodash';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import styled from 'styled-components';
import Flex from 'shared/components/Flex';
import Avatar from 'components/Avatar';
import Tooltip from 'components/Tooltip';
import Document from 'models/Document';
import UserProfile from 'scenes/UserProfile';
import ViewsStore from 'stores/ViewsStore';

const MAX_DISPLAY = 6;

type Props = {
  views: ViewsStore,
  document: Document,
};

@observer
class Collaborators extends React.Component<Props> {
  @observable openProfileId: ?string;

  componentDidMount() {
    this.props.views.fetchPage({ documentId: this.props.document.id });
  }

  handleOpenProfile = (userId: string) => {
    this.openProfileId = userId;
  };

  handleCloseProfile = () => {
    this.openProfileId = undefined;
  };

  render() {
    const { document, views } = this.props;
    const documentViews = views.inDocument(document.id);
    const { createdAt, updatedAt, updatedBy, collaborators } = document;

    // filter to only show views that haven't collaborated
    const collaboratorIds = collaborators.map(user => user.id);
    const viewersNotCollaborators = filter(
      documentViews,
      view => !collaboratorIds.includes(view.user.id)
    );

    // only show the most recent viewers, the rest can overflow
    const mostRecentViewers = viewersNotCollaborators.slice(
      0,
      MAX_DISPLAY - collaborators.length
    );

    // if there are too many to display then add a (+X) to the UI
    const overflow = viewersNotCollaborators.length - mostRecentViewers.length;

    return (
      <Avatars>
        {overflow > 0 && <More>+{overflow}</More>}
        {mostRecentViewers.map(({ lastViewedAt, user }) => (
          <React.Fragment key={user.id}>
            <AvatarPile
              tooltip={
                <TooltipCentered>
                  <strong>{user.name}</strong>
                  <br />
                  viewed {distanceInWordsToNow(new Date(lastViewedAt))} ago
                </TooltipCentered>
              }
              placement="bottom"
            >
              <Viewer>
                <Avatar
                  src={user.avatarUrl}
                  onClick={() => this.handleOpenProfile(user.id)}
                  size={32}
                />
              </Viewer>
            </AvatarPile>
            <UserProfile
              user={user}
              isOpen={this.openProfileId === user.id}
              onRequestClose={this.handleCloseProfile}
            />
          </React.Fragment>
        ))}
        {collaborators.map(user => (
          <React.Fragment key={user.id}>
            <AvatarPile
              tooltip={
                <TooltipCentered>
                  <strong>{user.name}</strong>
                  <br />
                  {createdAt === updatedAt ? 'published' : 'updated'}{' '}
                  {updatedBy.id === user.id &&
                    `${distanceInWordsToNow(new Date(updatedAt))} ago`}
                </TooltipCentered>
              }
              placement="bottom"
            >
              <Collaborator>
                <Avatar
                  src={user.avatarUrl}
                  onClick={() => this.handleOpenProfile(user.id)}
                  size={32}
                />
              </Collaborator>
            </AvatarPile>
            <UserProfile
              user={user}
              isOpen={this.openProfileId === user.id}
              onRequestClose={this.handleCloseProfile}
            />
          </React.Fragment>
        ))}
      </Avatars>
    );
  }
}

const TooltipCentered = styled.div`
  text-align: center;
`;

const AvatarPile = styled(Tooltip)`
  margin-right: -8px;

  &:first-child {
    margin-right: 0;
  }
`;

const Viewer = styled.div`
  width: 32px;
  height: 32px;
  opacity: 0.75;
`;

const Collaborator = styled.div`
  width: 32px;
  height: 32px;
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

export default inject('views')(Collaborators);
