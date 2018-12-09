// @flow
import * as React from 'react';
import styled from 'styled-components';

type Props = {
  src?: string,
  border?: boolean,
  forwardedRef: *,
  width?: string,
  height?: string,
};

type State = {
  isLoaded: boolean,
};

class Frame extends React.Component<Props, State> {
  mounted: boolean;

  state = { isLoaded: false };

  componentDidMount() {
    this.mounted = true;
    setImmediate(this.loadIframe);
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  loadIframe = () => {
    if (!this.mounted) return;
    this.setState({ isLoaded: true });
  };

  render() {
    const {
      border,
      width = '100%',
      height = '400',
      forwardedRef,
      ...rest
    } = this.props;
    const Component = border ? Iframe : 'iframe';
    if (!this.state.isLoaded) return <div style={{ width, height }} />;

    return (
      <Component
        ref={forwardedRef}
        width={width}
        height={height}
        type="text/html"
        frameBorder="0"
        title="embed"
        allowFullScreen
        {...rest}
      />
    );
  }
}

const Iframe = styled.iframe`
  border: 1px solid;
  border-color: #ddd #ddd #ccc;
  border-radius: 3px;
`;

// $FlowIssue - https://github.com/facebook/flow/issues/6103
export default React.forwardRef((props, ref) => (
  <Frame {...props} forwardedRef={ref} />
));
