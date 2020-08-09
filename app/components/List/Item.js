// @flow
import * as React from "react";
import styled from "styled-components";
import Flex from "components/Flex";

type Props = {
  image?: React.Node,
  title: React.Node,
  subtitle?: React.Node,
  actions?: React.Node,
};

const ListItem = ({ image, title, subtitle, actions }: Props) => {
  const compact = !subtitle;

  return (
    <Wrapper compact={compact}>
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
  padding: ${(props) => (props.compact ? "8px" : "12px")} 0;
  margin: 0;
  border-bottom: 1px solid ${(props) => props.theme.divider};

  &:last-child {
    border-bottom: 0;
  }
`;

const Image = styled(Flex)`
  padding: 0 8px 0 0;
  max-height: 40px;
  align-items: center;
  user-select: none;
  flex-shrink: 0;
  align-self: flex-start;
`;

const Heading = styled.p`
  font-size: 16px;
  font-weight: 500;
  line-height: 1.2;
  margin: 0;
`;

const Content = styled(Flex)`
  flex-grow: 1;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${(props) => props.theme.slate};
`;

const Actions = styled.div`
  align-self: center;
`;

export default ListItem;
