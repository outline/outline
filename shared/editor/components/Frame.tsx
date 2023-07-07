import { observable } from "mobx";
import { observer } from "mobx-react";
import { OpenIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { Optional } from "utility-types";
import { s } from "../../styles";
import { sanitizeUrl } from "../../utils/urls";

type Props = Omit<Optional<HTMLIFrameElement>, "children"> & {
  src?: string;
  border?: boolean;
  title?: string;
  icon?: React.ReactNode;
  canonicalUrl?: string;
  isSelected?: boolean;
  width?: string;
  height?: string;
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
      width = "100%",
      height = "400px",
      forwardedRef,
      icon,
      title,
      canonicalUrl,
      isSelected,
      referrerPolicy,
      className = "",
      src,
    } = this.props;
    const withBar = !!(icon || canonicalUrl);

    return (
      <Rounded
        width={width}
        height={height}
        $withBar={withBar}
        $border={border}
        className={
          isSelected ? `ProseMirror-selectednode ${className}` : className
        }
      >
        {this.isLoaded && (
          <Iframe
            ref={forwardedRef}
            $withBar={withBar}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-storage-access-by-user-activation"
            width={width}
            height={height}
            frameBorder="0"
            title="embed"
            loading="lazy"
            src={sanitizeUrl(src)}
            referrerPolicy={referrerPolicy}
            allowFullScreen
          />
        )}
        {withBar && (
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

const Iframe = styled.iframe<{ $withBar: boolean }>`
  border-radius: ${(props) => (props.$withBar ? "3px 3px 0 0" : "3px")};
  display: block;
`;

const Rounded = styled.div<{
  width: string;
  height: string;
  $withBar: boolean;
  $border?: boolean;
}>`
  border: 1px solid
    ${(props) => (props.$border ? props.theme.embedBorder : "transparent")};
  border-radius: 6px;
  overflow: hidden;
  width: ${(props) => props.width};
  height: ${(props) => (props.$withBar ? props.height + 28 : props.height)};
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
  background: ${s("secondaryBackground")};
  color: ${s("textSecondary")};
  padding: 0 8px;
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  user-select: none;
  position: relative;
`;

export default React.forwardRef<HTMLIFrameElement, Props>((props, ref) => (
  <Frame {...props} forwardedRef={ref} />
));
