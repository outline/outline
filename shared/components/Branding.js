// @flow
import * as React from 'react';
import styled from 'styled-components';
import OutlineLogo from './OutlineLogo';

type Props = {
  href?: string,
};

function Branding({ href = process.env.URL }: Props) {
  return (
    <Link href={href}>
      <OutlineLogo size={16} fill="#000" />&nbsp;Outline
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
