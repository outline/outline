// @flow
import React from 'react';
import moment from 'moment';
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
    tooltip = `${createdBy.name} published ${moment(createdAt).fromNow()}`;
  } else {
    tooltip = `${updatedBy.name} modified ${moment(updatedAt).fromNow()}`;
  }

  return (
    <Avatars>
      <StyledTooltip tooltip={tooltip} placement="bottom">
        {collaborators.map(user => (
          <Avatar key={user.id} src={user.avatarUrl} />
        ))}
      </StyledTooltip>
    </Avatars>
  );
};

const StyledTooltip = styled(Tooltip)`
  display: flex;
  flex-direction: row-reverse;
`;

const Avatars = styled(Flex)`
  align-items: center;
  flex-direction: row-reverse;

  ${Avatar} & {
    margin-right: -10px;
  }

  ${Avatar} &:first-child {
    margin-right: 0;
  }
`;

export default Collaborators;
