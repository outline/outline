// @flow
import React from 'react';
import moment from 'moment';
import styled from 'styled-components';
import { color } from 'shared/styles/constants';
import Flex from 'components/Flex';
import Tooltip from 'components/Tooltip';
import Document from 'models/Document';

const Collaborators = function({ document }: { document: Document }) {
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
  flex-direction: row-reverse;
  height: 26px;
`;

const Avatar = styled.img`
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid ${color.white};
  margin-right: -10px;

  &:first-child {
    margin-right: 0;
  }
`;

export default Collaborators;
