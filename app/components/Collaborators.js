// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { filter } from 'lodash';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import styled from 'styled-components';
import Flex from 'shared/components/Flex';
import Avatar from 'components/Avatar';
import Tooltip from 'components/Tooltip';
import Document from 'models/Document';
import ViewsStore from 'stores/ViewsStore';

const MAX_DISPLAY = 6;

type Props = {
  views: ViewsStore,
  document: Document,
};

@observer
class Collaborators extends React.Component<Props> {
  componentDidMount() {
    this.props.views.fetchPage({ documentId: this.props.document.id });
  }

  render() {
    const { document, views } = this.props;
    const documentViews = views.inDocument(document.id);
    const {
      createdAt,
      updatedAt,
      createdBy,
      updatedBy,
      collaborators,
    } = document;
    let tooltip;

    if (createdAt === updatedAt) {
      tooltip = `${createdBy.name} published ${distanceInWordsToNow(
        new Date(createdAt)
      )} ago`;
    } else {
      tooltip = `${updatedBy.name} updated ${distanceInWordsToNow(
        new Date(updatedAt)
      )} ago`;
    }

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
          <StyledTooltip
            key={user.id}
            tooltip={`${user.name} viewed ${distanceInWordsToNow(
              new Date(lastViewedAt)
            )} ago`}
            placement="bottom"
          >
            <Viewer>
              <Avatar src={user.avatarUrl} />
            </Viewer>
          </StyledTooltip>
        ))}
        {collaborators.map(user => (
          <StyledTooltip
            key={user.id}
            tooltip={collaborators.length > 1 ? user.name : tooltip}
            placement="bottom"
          >
            <Collaborator>
              <Avatar src={user.avatarUrl} />
            </Collaborator>
          </StyledTooltip>
        ))}
      </Avatars>
    );
  }
}

const StyledTooltip = styled(Tooltip)`
  margin-right: -8px;

  &:first-child {
    margin-right: 0;
  }
`;

const Viewer = styled.div`
  width: 24px;
  height: 24px;
  opacity: 0.75;
`;

const Collaborator = styled.div`
  width: 24px;
  height: 24px;
`;

const More = styled.div`
  min-width: 30px;
  height: 24px;
  border-radius: 12px;
  background: ${props => props.theme.slate};
  color: ${props => props.theme.text};
  border: 2px solid #fff;
  text-align: center;
  line-height: 20px;
  font-size: 11px;
  font-weight: 600;
`;

const Avatars = styled(Flex)`
  align-items: center;
  flex-direction: row-reverse;
`;

export default inject('views')(Collaborators);
