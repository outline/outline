// @flow
import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import Flex from "components/Flex";

type Props = {|
  label: React.Node | string,
  children: React.Node,
|};

const Labeled = ({ label, children, ...props }: Props) => (
  <Flex column {...props}>
    <Label>{label}</Label>
    {children}
  </Flex>
);

export const Label = styled(Flex)`
  font-weight: 500;
  padding-bottom: 4px;
  display: inline-block;
  color: ${(props) => props.theme.text};
`;

export default observer(Labeled);
