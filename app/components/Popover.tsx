import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import useKeyDown from "~/hooks/useKeyDown";
import useMobile from "~/hooks/useMobile";
import { fadeAndScaleIn } from "~/styles/animations";

type Props = {
  children: React.ReactNode;
  /** Whether the popover is open */
  open?: boolean;
  /** Callback when the popover open state changes */
  onOpenChange?: (open: boolean) => void;
  /** The width of the popover, defaults to 380px. */
  width?: number;
  /** The minimum width of the popover, use instead of width if contents adjusts size. */
  minWidth?: number;
  /** Shrink the padding of the popover */
  shrink?: boolean;
  /** Make the popover flex */
  flex?: boolean;
  /** The tab index of the popover */
  tabIndex?: number;
  /** Whether the popover should be scrollable, defaults to true. */
  scrollable?: boolean;
  /** The position of the popover on mobile, defaults to "top". */
  mobilePosition?: "top" | "bottom";
  /** Function to show the popover */
  show?: () => void;
  /** Function to hide the popover */
  hide?: () => void;
  /** Whether the popover is visible */
  visible?: boolean;
  /** Custom style for the popover */
  style?: React.CSSProperties;
  /** Aria label for the popover */
  "aria-label"?: string;
  /** Whether to hide on escape key */
  hideOnEsc?: boolean;
  /** Whether to hide on click outside */
  hideOnClickOutside?: boolean;
  /** Final focus ref for accessibility */
  unstable_finalFocusRef?: React.RefObject<HTMLElement>;
  /** Reference ref for positioning */
  unstable_referenceRef?: React.RefObject<HTMLElement | null>;
  /** Legacy reakit props for backward compatibility */
  baseId?: string;
  animated?: number | boolean;
  animating?: boolean;
  setBaseId?: React.Dispatch<React.SetStateAction<string>>;
  setVisible?: React.Dispatch<React.SetStateAction<boolean>>;
  setAnimated?: React.Dispatch<React.SetStateAction<number | boolean>>;
  stopAnimation?: () => void;
  modal?: boolean;
  unstable_disclosureRef?: React.MutableRefObject<HTMLElement | null>;
  setModal?: React.Dispatch<React.SetStateAction<boolean>>;
  unstable_popoverRef?: React.RefObject<HTMLElement | null>;
  unstable_arrowRef?: React.RefObject<HTMLElement | null>;
  unstable_popoverStyles?: React.CSSProperties;
  unstable_arrowStyles?: React.CSSProperties;
  unstable_originalPlacement?: any;
  unstable_update?: () => boolean;
  placement?: any;
  place?: React.Dispatch<React.SetStateAction<any>>;
  toggle?: () => void;
  onClick?: (e: any) => any;
  unstable_initialFocusRef?: React.RefObject<HTMLElement>;
  unstable_autoFocusOnShow?: boolean;
  unstable_idCountRef?: React.MutableRefObject<number>;
};

const Popover = (
  {
    children,
    open,
    onOpenChange,
    shrink,
    width = 380,
    minWidth,
    scrollable = true,
    flex,
    mobilePosition,
    show,
    hide,
    visible,
    style,
    hideOnEsc = true,
    hideOnClickOutside = true,
    unstable_finalFocusRef,
    unstable_referenceRef,
    // Legacy reakit props - ignored for compatibility
    baseId,
    animated,
    animating,
    setBaseId,
    setVisible,
    setAnimated,
    stopAnimation,
    modal,
    unstable_disclosureRef,
    setModal,
    unstable_popoverRef,
    unstable_arrowRef,
    unstable_popoverStyles,
    unstable_arrowStyles,
    unstable_originalPlacement,
    unstable_update,
    placement,
    place,
    toggle,
    onClick,
    unstable_initialFocusRef,
    unstable_autoFocusOnShow,
    unstable_idCountRef,
    ...rest
  }: Props,
  ref: React.Ref<HTMLDivElement>
) => {
  const isMobile = useMobile();

  // Handle legacy reakit API compatibility
  const isOpen = open ?? visible ?? false;
  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (onOpenChange) {
        onOpenChange(newOpen);
      } else if (!newOpen && hide) {
        hide();
      } else if (newOpen && show) {
        show();
      }
    },
    [onOpenChange, hide, show]
  );

  // Custom Escape handler rather than using hideOnEsc from radix so we can
  // prevent default behavior of exiting fullscreen.
  useKeyDown(
    "Escape",
    (event) => {
      if (isOpen && hideOnEsc !== false) {
        event.preventDefault();
        handleOpenChange(false);
      }
    },
    {
      allowInInput: true,
    }
  );

  if (isMobile) {
    return (
      <PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            ref={ref}
            style={style}
            onEscapeKeyDown={hideOnEsc ? undefined : (e) => e.preventDefault()}
            onPointerDownOutside={
              hideOnClickOutside ? undefined : (e) => e.preventDefault()
            }
            {...rest}
          >
            <Contents
              $shrink={shrink}
              $scrollable={scrollable}
              $flex={flex}
              $mobilePosition={mobilePosition}
            >
              {children}
            </Contents>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Portal>
        <StyledPopoverContent
          ref={ref}
          style={style}
          onEscapeKeyDown={hideOnEsc ? undefined : (e) => e.preventDefault()}
          onPointerDownOutside={
            hideOnClickOutside ? undefined : (e) => e.preventDefault()
          }
          {...rest}
        >
          <Contents
            $shrink={shrink}
            $width={width}
            $minWidth={minWidth}
            $scrollable={scrollable}
            $flex={flex}
          >
            {children}
          </Contents>
        </StyledPopoverContent>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};

type ContentsProps = {
  $shrink?: boolean;
  $width?: number;
  $minWidth?: number;
  $flex?: boolean;
  $scrollable: boolean;
  $mobilePosition?: "top" | "bottom";
};

const StyledPopoverContent = styled(PopoverPrimitive.Content)`
  z-index: ${depths.modal};
  outline: none;
`;

const Contents = styled.div<ContentsProps>`
  display: ${(props) => (props.$flex ? "flex" : "block")};
  animation: ${fadeAndScaleIn} 200ms ease;
  transform-origin: 75% 0;
  background: ${s("menuBackground")};
  border-radius: 6px;
  padding: ${(props) => (props.$shrink ? "6px 0" : "12px 24px")};
  max-height: 75vh;
  box-shadow: ${s("menuShadow")};
  ${(props) => props.$width && `width: ${props.$width}px`};
  ${(props) => props.$minWidth && `min-width: ${props.$minWidth}px`};

  ${(props) =>
    props.$scrollable
      ? `
      overflow-x: hidden;
      overflow-y: auto;
    `
      : `
      overflow: hidden;
    `}

  ${breakpoint("mobile", "tablet")`
    position: fixed;
    z-index: ${depths.menu};

    // 50 is a magic number that positions us nicely under the top bar
    top: ${(props: ContentsProps) =>
      props.$mobilePosition === "bottom" ? "auto" : "50px"};
    bottom: ${(props: ContentsProps) =>
      props.$mobilePosition === "bottom" ? "0" : "auto"};
    left: 8px;
    right: 8px;
    width: auto;
  `};
`;

export default React.forwardRef(Popover);
