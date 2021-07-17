// @flow
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Flex from "components/Flex";

type Props = {|
  image?: React.Node,
  to?: string,
  title: React.Node,
  subtitle?: React.Node,
  actions?: React.Node,
  border?: boolean,
  small?: boolean,
|};

const ListItem = (
  { image, title, subtitle, actions, small, border, to, ...rest }: Props,
  ref
) => {
  const compact = !subtitle;

  return (
    <Wrapper
      ref={ref}
      compact={compact}
      $border={border}
      {...rest}
      as={to ? Link : undefined}
      to={to}
    >
      {image && <Image>{image}</Image>}
      <Content align={compact ? "center" : undefined} column={!compact}>
        <Heading $small={small}>{title}</Heading>
        {subtitle && <Subtitle $small={small}>{subtitle}</Subtitle>}
      </Content>
      {actions && <Actions>{actions}</Actions>}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  padding: ${(props) => (props.$border === false ? 0 : "8px 0")};
  margin: ${(props) => (props.$border === false ? "8px 0" : 0)};
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
  font-size: ${(props) => (props.$small ? 14 : 16)}px;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  line-height: ${(props) => (props.$small ? 1.3 : 1.2)};
  margin: 0;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  color: ${(props) => props.theme.text};
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: ${(props) => (props.$small ? 13 : 14)}px;
  color: ${(props) => props.theme.textTertiary};
  margin-top: -2px;
`;

export const Actions = styled.div`
  align-self: center;
  justify-content: center;
`;

export default React.forwardRef<Props, HTMLDivElement>(ListItem);
