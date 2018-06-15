// @flow
import * as React from 'react';
import styled from 'styled-components';

type Props = {
  isLoading?: boolean,
  image?: string,
  title?: string,
  url: string,
  subtitle: React.Node,
  children?: React.Node,
};

type State = {
  expanded: boolean,
};

class MediaBlock extends React.Component<Props, State> {
  state = {
    expanded: false,
  };

  toggleExpanded = () => {
    this.setState({ expanded: !this.state.expanded });
  };

  render() {
    const { isLoading, image, title, url, subtitle, children } = this.props;
    const hasToggle = !!children;

    return (
      <Wrapper contentEditable={false}>
        {hasToggle && <a onClick={this.toggleExpanded}>Toggle</a>}
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
        {this.state.expanded && children}
      </Wrapper>
    );
  }
}

const Wrapper = styled.div`
  display: flex;
  margin: 0;
  border: 2px solid ${props => props.theme.smokeDark};
  border-radius: 4px;
  overflow: hidden;
`;

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
