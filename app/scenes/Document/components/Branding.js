// @flow
import * as React from 'react';
import styled from 'styled-components';
import OutlineLogo from 'shared/components/OutlineLogo';

function Branding() {
  return (
    <Link href={process.env.URL}>
      <OutlineLogo />&nbsp;Outline
    </Link>
  );
}

const Link = styled.a`
  position: fixed;
  bottom: 0;
  left: 0;

  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  border-top-right-radius: 2px;
  color: ${props => props.theme.black};
  display: flex;
  align-items: center;
  padding: 12px;
  opacity: 0.8;

  &:hover {
    opacity: 1;
    background: ${props => props.theme.smoke};
  }
`;

export default Branding;
