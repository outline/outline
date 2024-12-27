import { observable } from "mobx";
import { observer } from "mobx-react";
import { OpenIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { Optional } from "utility-types";
import { s } from "../../styles";
import { sanitizeUrl } from "../../utils/urls";

type Props = Omit<Optional<HTMLIFrameElement>, "children" | "style"> & {
  /** The URL to load in the iframe */
  src?: string;
  /** Whether to display a border, defaults to true */
  border?: boolean;
  /** The aria title of the frame */
  title?: string;
  /** An icon to display under the frame representing the service */
  icon?: React.ReactNode;
  /** The canonical URL of the content */
  canonicalUrl?: string;
  /** Whether the node is currently selected */
  isSelected?: boolean;
  /** Additional styling */
  style?: React.CSSProperties;
  /** The allow policy of the frame */
  allow?: string;
};

type PropsWithRef = Props & {
  forwardedRef: React.Ref<HTMLIFrameElement>;
};

@observer
class Frame extends React.Component<PropsWithRef> {
  mounted: boolean;

  @observable
  isLoaded = false;

  componentDidMount() {
    this.mounted = true;
    setTimeout(this.loadIframe, 0);
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  loadIframe = () => {
    if (!this.mounted) {
      return;
    }
    this.isLoaded = true;
  };

  render() {
    const {
      border,
      style = {},
      forwardedRef,
      icon,
      title,
      canonicalUrl,
      isSelected,
      referrerPolicy,
      className = "",
      src,
    } = this.props;
    const showBottomBar = !!(icon || canonicalUrl);

    return (
      <Rounded
        style={style}
        $showBottomBar={showBottomBar}
        $border={border}
        className={
          isSelected ? `ProseMirror-selectednode ${className}` : className
        }
      >
        {this.isLoaded && (
          <Iframe
            ref={forwardedRef}
            $showBottomBar={showBottomBar}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-storage-access-by-user-activation"
            style={style}
            frameBorder="0"
            title="embed"
            loading="lazy"
            src={sanitizeUrl(src)}
            referrerPolicy={referrerPolicy}
            allowFullScreen
          />
        )}
        {showBottomBar && (
          <Bar>
            {icon} <Title>{title}</Title>
            {canonicalUrl && (
              <Open
                href={canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <OpenIcon size={18} /> Open
              </Open>
            )}
          </Bar>
        )}
      </Rounded>
    );
  }
}

const Iframe = styled.iframe<{ $showBottomBar: boolean }>`
  border-radius: ${(props) => (props.$showBottomBar ? "3px 3px 0 0" : "3px")};
  display: block;
`;

const Rounded = styled.div<{
  $showBottomBar: boolean;
  $border?: boolean;
}>`
  border: 1px solid
    ${(props) => (props.$border ? props.theme.embedBorder : "transparent")};
  border-radius: 6px;
  overflow: hidden;

  ${(props) =>
    props.$showBottomBar &&
    `
    padding-bottom: 28px;
  `}
`;

const Open = styled.a`
  color: ${s("textSecondary")} !important;
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

const Bar = styled.div`
  display: flex;
  align-items: center;
  border-top: 1px solid ${(props) => props.theme.embedBorder};
  background: ${s("backgroundSecondary")};
  color: ${s("textSecondary")};
  padding: 0 8px;
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  user-select: none;
  height: 28px;
  position: relative;
`;

export default React.forwardRef<HTMLIFrameElement, Props>((props, ref) => (
  <Frame {...props} forwardedRef={ref} />
));
