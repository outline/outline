// @flow
import React from 'react';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import styled from 'styled-components';
import Flex from 'shared/components/Flex';
import Avatar from 'components/Avatar';
import Tooltip from 'components/Tooltip';
import Document from 'models/Document';

type Props = { document: Document };

const Collaborators = ({ document }: Props) => {
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

  return (
    <Avatars>
      <StyledTooltip tooltip={tooltip} placement="bottom">
        {collaborators.map(user => (
          <AvatarWrapper key={user.id}>
            <Avatar src={user.avatarUrl} />
          </AvatarWrapper>
        ))}
      </StyledTooltip>
    </Avatars>
  );
};

const StyledTooltip = styled(Tooltip)`
  display: flex;
  flex-direction: row-reverse;
`;

const AvatarWrapper = styled.div`
  width: 24px;
  height: 24px;
  margin-right: -10px;

  &:first-child {
    margin-right: 0;
  }
`;

const Avatars = styled(Flex)`
  align-items: center;
  flex-direction: row-reverse;
`;

export default Collaborators;
