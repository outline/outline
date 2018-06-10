// @flow
import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

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
  color: ${props => props.theme.white};
  background: ${props => props.theme.warning};
  font-size: 15px;
  border-radius: 5px;
  cursor: default;

  a {
    color: ${props => props.theme.white};
    text-decoration: underline;
  }
`;

export default TeamSuspended;
