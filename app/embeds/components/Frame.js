// @flow
import { observable } from "mobx";
import { observer } from "mobx-react";
import { OpenIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import Flex from "components/Flex";

type Props = {
  src?: string,
  border?: boolean,
  title?: string,
  icon?: React.Node,
  canonicalUrl?: string,
  isSelected?: boolean,
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
      icon,
      title,
      canonicalUrl,
      isSelected,
      src,
    } = this.props;
    const Component = border ? StyledIframe : "iframe";
    const withBar = !!(icon || canonicalUrl);

    return (
      <Rounded
        width={width}
        height={height}
        withBar={withBar}
        className={isSelected ? "ProseMirror-selectednode" : ""}
      >
        {this.isLoaded && (
          <Component
            ref={forwardedRef}
            withBar={withBar}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            width={width}
            height={height}
            type="text/html"
            frameBorder="0"
            title="embed"
            loading="lazy"
            src={src}
            allowFullScreen
          />
        )}
        {withBar && (
          <Bar align="center">
            {icon} <Title>{title}</Title>
            {canonicalUrl && (
              <Open
                href={canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <OpenIcon color="currentColor" size={18} /> Open
              </Open>
            )}
          </Bar>
        )}
      </Rounded>
    );
  }
}

const Rounded = styled.div`
  border-radius: ${(props) => (props.withBar ? "3px 3px 0 0" : "3px")};
  overflow: hidden;
  width: ${(props) => props.width};
  height: ${(props) => (props.withBar ? props.height + 28 : props.height)};
`;

const Open = styled.a`
  color: ${(props) => props.theme.textSecondary} !important;
  font-size: 13px;
  font-weight: 500;
  align-items: center;
  display: flex;
  position: absolute;
  right: 0;
  padding: 0 8px;
`;

const Title = styled.span`
  font-size: 13px;
  font-weight: 500;
  padding-left: 4px;
`;

const Bar = styled(Flex)`
  background: ${(props) => props.theme.secondaryBackground};
  color: ${(props) => props.theme.textSecondary};
  padding: 0 8px;
  border-bottom-left-radius: 3px;
  border-bottom-right-radius: 3px;
  user-select: none;
`;

// This wrapper allows us to pass non-standard HTML attributes through to the DOM element
// https://www.styled-components.com/docs/basics#passed-props
const Iframe = (props) => <iframe {...props} />;

const StyledIframe = styled(Iframe)`
  border: 1px solid;
  border-color: ${(props) => props.theme.embedBorder};
  border-radius: ${(props) => (props.withBar ? "3px 3px 0 0" : "3px")};
  display: block;
`;

export default React.forwardRef<Props, typeof Frame>((props, ref) => (
  <Frame {...props} forwardedRef={ref} />
));
