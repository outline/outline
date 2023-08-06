import * as React from "react";
import styled from "styled-components";
import Flex from "~/components/Flex";
import Item from "~/components/List/Item";

const Integration = ({
  icon,
  ...props
}: Omit<React.ComponentProps<typeof Item>, "image"> & {
  icon: React.ReactNode;
}) => <Item image={<IconBackground>{icon}</IconBackground>} {...props} />;

const IconBackground = styled(Flex)`
  background: ${(props) => props.theme.secondaryBackground};
  border-radius: 4px;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
`;

export default Integration;
