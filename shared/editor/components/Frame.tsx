import * as Popover from "@radix-ui/react-popover";
import copy from "copy-to-clipboard";
import { CopyIcon, EditIcon, OpenIcon } from "outline-icons";
import { useState, useEffect, useRef, useCallback } from "react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { Optional } from "utility-types";
import Flex from "../../components/Flex";
import { depths, s } from "../../styles";
import { sanitizeUrl } from "../../utils/urls";
import Input from "../components/Input";

type IframeProps = React.IframeHTMLAttributes<HTMLIFrameElement>;

type Props = Omit<Optional<IframeProps>, "children" | "style"> & {
  /** The URL to load in the iframe */
  src: string;
  /** The canonical URL of the content */
  canonicalUrl: string;
  /** The title of the frame */
  title: string;
  /** An icon to display under the frame representing the service */
  icon?: React.ReactNode;
  /** Whether the node is currently selected */
  isSelected?: boolean;
  /** Additional styling */
  style?: React.CSSProperties;
  /** Callback when URL is changed */
  onUrlChange: (url: string) => void;
};

type PropsWithRef = Props & {
  forwardedRef: React.Ref<HTMLIFrameElement>;
};

const Frame = ({
  style = {},
  forwardedRef,
  icon,
  title,
  canonicalUrl,
  isSelected,
  referrerPolicy,
  className = "",
  src,
  onUrlChange,
  ...rest
}: PropsWithRef) => {
  const { t } = useTranslation();
  const [isLoaded, setIsLoaded] = useState(false);
  const mountedRef = useRef(true);

  const handleCopyLink = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (canonicalUrl) {
        copy(canonicalUrl);
        toast.success(t("Link copied to clipboard"));
      }
    },
    [t, canonicalUrl]
  );

  useEffect(() => {
    // Set mounted flag
    mountedRef.current = true;

    // Load iframe after a small delay
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setIsLoaded(true);
      }
    }, 0);

    // Cleanup function
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <Rounded
      style={style}
      className={
        isSelected ? `ProseMirror-selectednode ${className}` : className
      }
    >
      {isLoaded && (
        <Iframe
          ref={forwardedRef}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-storage-access-by-user-activation"
          style={style}
          frameBorder="0"
          title="embed"
          loading="lazy"
          src={sanitizeUrl(src)}
          referrerPolicy={referrerPolicy}
          allowFullScreen
          {...rest}
        />
      )}
      <Toolbar>
        <Flex align="center" gap={4}>
          {icon} <Title>{title}</Title>
        </Flex>
        <Actions>
          <EditLink url={canonicalUrl} onUrlChange={onUrlChange} />
          <Button onClick={handleCopyLink}>
            <CopyIcon size={18} />
          </Button>
          <Button
            as={"a"}
            href={canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <OpenIcon size={18} />
          </Button>
        </Actions>
      </Toolbar>
    </Rounded>
  );
};

function EditLink({
  url,
  onUrlChange,
}: {
  url: string;
  onUrlChange: (url: string) => void;
}) {
  const [localUrl, setLocalUrl] = useState(url);
  const [open, setOpen] = useState(false);

  const handleKeydown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }

      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      onUrlChange(localUrl);
    },
    [localUrl, onUrlChange]
  );

  const reset = useCallback(() => {
    setLocalUrl(url);
  }, [url]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button>
          <EditIcon size={18} />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <StyledPopoverContent
          side="bottom"
          align="start"
          onPointerDownOutside={reset}
          onEscapeKeyDown={reset}
        >
          <LinkInput
            type="text"
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
            onKeyDown={handleKeydown}
          />
        </StyledPopoverContent>
      </Popover.Portal>
    </Popover.Root>
  );
}

const Iframe = styled.iframe`
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
  display: block;
`;

const Rounded = styled.div`
  border: ${(props) => `1px solid ${props.theme.embedBorder}`};
  border-radius: 6px;
  overflow: hidden;
  padding-bottom: 28px;
`;

const Title = styled.span`
  font-size: 13px;
  font-weight: 500;
  padding-left: 4px;
`;

const Actions = styled(Flex)`
  display: flex;
  align-items: center;
`;

const Button = styled.button`
  border: 0;
  margin: 0;
  padding: 0;
  background: none;
  color: ${s("textSecondary")} !important;
  width: 24px;
  height: 24px;
  display: inline-block;
  cursor: var(--pointer) !important;
  transition: transform 150ms ease-in-out, color 150ms ease-in-out;

  &:active {
    transform: scale(0.98);
  }

  &:hover {
    color: ${s("text")} !important;
  }
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
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

const StyledPopoverContent = styled(Popover.Content)`
  background: ${s("menuBackground")};
  width: 300px;
  max-height: 75vh;
  padding: 6px;
  box-shadow: ${s("menuShadow")};
  z-index: ${depths.modal};
  overflow-x: hidden;
  overflow-y: auto;
  outline: none;
`;

const LinkInput = styled(Input)`
  height: 24px;
  width: 100%;
  padding: 4px;
  color: ${s("textSecondary")};
`;

export default React.forwardRef<HTMLIFrameElement, Props>((props, ref) => (
  <Frame {...props} forwardedRef={ref} />
));
