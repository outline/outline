// @flow
import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

import { color } from 'shared/styles/constants';

const TeamSuspended = () => {
  return (
    <Container>
      Your team is over free user limit and is now in <strong>read-only</strong>{' '}
      mode. <Link to="/settings/billing">Please subscribe for a paid plan</Link>{' '}
      to continue using Outline.
    </Container>
  );
};

const Container = styled.div`
  padding: 8px 12px;
  color: ${color.white};
  background: ${color.warning};
  font-size: 15px;
  border-radius: 5px;
  cursor: default;

  a {
    color: ${color.white};
    text-decoration: underline;
  }
`;

export default TeamSuspended;
