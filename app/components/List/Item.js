// @flow
import * as React from "react";
import styled from "styled-components";
import Flex from "components/Flex";

type Props = {
  image?: React.Node,
  title: React.Node,
  subtitle?: React.Node,
  actions?: React.Node,
  border?: boolean,
};

const ListItem = ({ image, title, subtitle, actions, border }: Props) => {
  const compact = !subtitle;

  return (
    <Wrapper compact={compact} $border={border}>
      {image && <Image>{image}</Image>}
      <Content align={compact ? "center" : undefined} column={!compact}>
        <Heading>{title}</Heading>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </Content>
      {actions && <Actions>{actions}</Actions>}
    </Wrapper>
  );
};

const Wrapper = styled.li`
  display: flex;
  padding: 8px 0;
  margin: 0;
  border-bottom: 1px solid
    ${(props) =>
      props.$border === false ? "transparent" : props.theme.divider};

  &:last-child {
    border-bottom: 0;
  }
`;

const Image = styled(Flex)`
  padding: 0 8px 0 0;
  max-height: 32px;
  align-items: center;
  user-select: none;
  flex-shrink: 0;
  align-self: center;
`;

const Heading = styled.p`
  font-size: 16px;
  font-weight: 500;
  line-height: 1.1;
  margin: 0;
`;

const Content = styled(Flex)`
  flex-grow: 1;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${(props) => props.theme.textTertiary};
  margin-top: -2px;
`;

const Actions = styled.div`
  align-self: center;
`;

export default ListItem;
