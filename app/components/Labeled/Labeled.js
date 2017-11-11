// @flow
import React from 'react';
import { observer } from 'mobx-react';
import Flex from 'shared/components/Flex';
import styled from 'styled-components';
import { size } from 'shared/styles/constants';

type Props = {
  label: React.Element<*> | string,
  children: React.Element<*>,
};

const Labeled = ({ label, children, ...props }: Props) => (
  <Flex column {...props}>
    <Label>{label}</Label>
    {children}
  </Flex>
);

export const Label = styled(Flex)`
  margin-bottom: ${size.medium};
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
  color: #9fa6ab;
  letter-spacing: 0.04em;
`;

export default observer(Labeled);
