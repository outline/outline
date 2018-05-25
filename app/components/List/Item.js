// @flow
import * as React from 'react';
import styled from 'styled-components';
import { color, fontSize } from 'shared/styles/constants';

type Props = {
  image?: React.Node,
  title: string,
  subtitle: React.Node,
  actions?: React.Node,
};

const ListItem = ({ image, title, subtitle, actions }: Props) => {
  return (
    <Wrapper>
      {image && <Image>{image}</Image>}
      <Content>
        <Heading>{title}</Heading>
        <Subtitle>{subtitle}</Subtitle>
      </Content>
      {actions && <Actions>{actions}</Actions>}
    </Wrapper>
  );
};

const Wrapper = styled.li`
  display: flex;
  padding: 12px 0;
  margin: 0;
  border-bottom: 1px solid ${color.smokeDark};
`;

const Image = styled.div`
  padding: 0 8px 0 0;
  max-height: 40px;
`;

const Heading = styled.h2`
  font-size: ${fontSize.medium};
  margin: 0;
`;

const Content = styled.div`
  flex-grow: 1;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: ${fontSize.small};
  color: ${color.slate};
`;

const Actions = styled.div`
  align-self: center;
`;

export default ListItem;
