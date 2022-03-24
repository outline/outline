import * as React from "react";
import styled from "styled-components";

type Props = {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

const ButtonLink: React.FC<Props> = React.forwardRef(
  (props: Props, ref: React.Ref<HTMLButtonElement>) => {
    return <Button {...props} ref={ref} />;
  }
);

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

export default ButtonLink;
