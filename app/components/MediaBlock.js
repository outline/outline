// @flow
import * as React from 'react';
import styled from 'styled-components';

type Props = {
  isLoading?: boolean,
  image?: string,
  title?: string,
  url: string,
  subtitle: React.Node,
  actions?: React.Node,
};

const MediaBlock = ({
  isLoading,
  image,
  title,
  url,
  subtitle,
  actions,
}: Props) => {
  return (
    <React.Fragment>
      <Content>
        <Heading>
          {isLoading ? (
            'Loading…'
          ) : (
            <Link href={url} target="_blank">
              {title}
            </Link>
          )}
        </Heading>
        <Subtitle>{subtitle}</Subtitle>
      </Content>
      <Link href={url} target="_blank">
        <Image
          style={image ? { backgroundImage: `url(${image})` } : undefined}
        />
      </Link>
    </React.Fragment>
  );
};

const Image = styled.div`
  background-color: ${props => props.theme.smokeDark};
  background-size: cover;
  background-position: center;
  width: 100px;
  height: 100%;
`;

const Link = styled.a`
  color: ${props => props.theme.text} !important;

  &:hover {
    text-decoration: underline;
  }
`;

const Heading = styled.h2`
  color: ${props => props.theme.text};
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 16px;
  margin: 0;
`;

const Content = styled.div`
  padding: 12px;
  flex-grow: 1;
  overflow: hidden;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${props => props.theme.slate};
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export default MediaBlock;
