// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import Flex from 'shared/components/Flex';
import styled from 'styled-components';

type Props = {
  label: React.Node | string,
  children: React.Node,
};

const Labeled = ({ label, children, ...props }: Props) => (
  <Flex column {...props}>
    <Label>{label}</Label>
    {children}
  </Flex>
);

export const Label = styled(Flex)`
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
  color: ${props => props.theme.textTertiary};
  letter-spacing: 0.04em;
`;

export default observer(Labeled);
