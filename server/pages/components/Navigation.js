// @flow
import React from 'react';
import styled from 'styled-components';
import { color } from '../../../shared/styles/constants';

function Navigation() {
  return (
    <nav>
      <Brand href="/">Atlas</Brand>
      <ul>
        <li><a href="/about">About</a></li>
        <li><a href="/pricing">Pricing</a></li>
      </ul>
    </nav>
  );
}

const Brand = styled.a`
  font-weight: 600;
  font-size: 20px;
  text-decoration: none;
  color: ${color.black};
`;

export default Navigation;
