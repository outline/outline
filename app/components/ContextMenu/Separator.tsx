import * as React from "react";
import { MenuSeparator } from "reakit/Menu";
import styled from "styled-components";

export default function Separator(rest: React.HTMLAttributes<HTMLHRElement>) {
  return (
    <MenuSeparator {...rest}>
      {(props) => <HorizontalRule {...props} />}
    </MenuSeparator>
  );
}

const HorizontalRule = styled.hr`
  margin: 6px 0;
`;
