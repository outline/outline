// @flow
import * as React from "react";
import styled from "styled-components";

type Props = {
  onClick: (ev: SyntheticEvent<>) => void,
  children: React.Node,
};

export default function ButtonLink(props: Props) {
  return <Button {...props} />;
}

const Button = styled.button`
  margin: 0;
  padding: 0;
  border: 0;
  color: ${(props) => props.theme.link};
  line-height: inherit;
  background: none;
  text-decoration: none;
  cursor: pointer;
`;
