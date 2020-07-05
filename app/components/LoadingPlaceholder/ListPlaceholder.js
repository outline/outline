// @flow
import * as React from "react";
import { times } from "lodash";
import styled from "styled-components";
import Mask from "components/Mask";
import Fade from "components/Fade";
import Flex from "shared/components/Flex";

type Props = {
  count?: number,
};

const ListPlaceHolder = ({ count }: Props) => {
  return (
    <Fade>
      {times(count || 2, index => (
        <Item key={index} column auto>
          <Mask header />
          <Mask />
        </Item>
      ))}
    </Fade>
  );
};

const Item = styled(Flex)`
  padding: 10px 0;
`;

export default ListPlaceHolder;
