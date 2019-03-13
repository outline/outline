// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import styled from 'styled-components';

type Props = {
  src?: string,
  border?: boolean,
  forwardedRef: *,
  width?: string,
  height?: string,
};

@observer
class Frame extends React.Component<Props> {
  mounted: boolean;
  @observable isLoaded: boolean = false;

  componentDidMount() {
    this.mounted = true;
    setImmediate(this.loadIframe);
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  loadIframe = () => {
    if (!this.mounted) return;
    this.isLoaded = true;
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

    return (
      <Rounded width={width} height={height}>
        {this.isLoaded && (
          <Component
            ref={forwardedRef}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            width={width}
            height={height}
            type="text/html"
            frameBorder="0"
            title="embed"
            allowFullScreen
            {...rest}
          />
        )}
      </Rounded>
    );
  }
}

const Rounded = styled.div`
  border-radius: 3px;
  overflow: hidden;
  width: ${props => props.width};
  height: ${props => props.height};
`;

const Iframe = styled.iframe`
  border: 1px solid;
  border-color: ${props => props.theme.embedBorder};
  border-radius: 3px;
`;

// $FlowIssue - https://github.com/facebook/flow/issues/6103
export default React.forwardRef((props, ref) => (
  <Frame {...props} forwardedRef={ref} />
));
