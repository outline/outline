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
export class Collaborators extends React.Component<Props> {
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
      tooltip = `${updatedBy.name} modified ${distanceInWordsToNow(
        new Date(updatedAt)
      )} ago`;
    }

    const collaboratorIds = collaborators.map(user => user.id);
    const viewers = filter(
      documentViews,
      view => !collaboratorIds.includes(view.user.id)
    ).slice(0, MAX_DISPLAY - collaborators.length);

    return (
      <Avatars>
        {viewers.map(({ user }) => (
          <StyledTooltip
            key={user.id}
            tooltip={`${user.name} viewed`}
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

const Avatars = styled(Flex)`
  align-items: center;
  flex-direction: row-reverse;
`;

export default inject('views')(Collaborators);
