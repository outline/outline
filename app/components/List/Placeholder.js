// @flow
import { times } from "lodash";
import * as React from "react";
import styled from "styled-components";
import Fade from "components/Fade";
import Flex from "components/Flex";
import PlaceholderText from "components/PlaceholderText";

type Props = {
  count?: number,
};

const Placeholder = ({ count }: Props) => {
  return (
    <Fade>
      {times(count || 2, (index) => (
        <Item key={index} column auto>
          <PlaceholderText />
        </Item>
      ))}
    </Fade>
  );
};

const Item = styled(Flex)`
  padding: 15px 0 16px;
`;

export default Placeholder;
