// @flow
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";

type Props = {
  src?: string,
  border?: boolean,
  width?: string,
  height?: string,
};

type PropsWithRef = Props & {
  forwardedRef: React.Ref<typeof StyledIframe>,
};

@observer
class Frame extends React.Component<PropsWithRef> {
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
      width = "100%",
      height = "400px",
      forwardedRef,
      ...rest
    } = this.props;
    const Component = border ? StyledIframe : "iframe";

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
            loading="lazy"
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
  width: ${(props) => props.width};
  height: ${(props) => props.height};
`;

// This wrapper allows us to pass non-standard HTML attributes through to the DOM element
// https://www.styled-components.com/docs/basics#passed-props
const Iframe = (props) => <iframe {...props} />;

const StyledIframe = styled(Iframe)`
  border: 1px solid;
  border-color: ${(props) => props.theme.embedBorder};
  border-radius: 3px;
`;

export default React.forwardRef<Props, typeof Frame>((props, ref) => (
  <Frame {...props} forwardedRef={ref} />
));
