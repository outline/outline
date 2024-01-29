import times from "lodash/times";
import * as React from "react";
import styled from "styled-components";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import PlaceholderText, {
  Props as PlaceholderTextProps,
} from "~/components/PlaceholderText";

type Props = {
  count?: number;
  className?: string;
  header?: PlaceholderTextProps;
  body?: PlaceholderTextProps;
};

const Placeholder = ({ count, className, header, body }: Props) => (
  <Fade>
    {times(count || 2, (index) => (
      <Item key={index} className={className} column auto>
        <PlaceholderText {...header} header delay={0.2 * index} />
        <PlaceholderText {...body} delay={0.2 * index} />
      </Item>
    ))}
  </Fade>
);

const Item = styled(Flex)`
  padding: 10px 0;
`;

export default Placeholder;
