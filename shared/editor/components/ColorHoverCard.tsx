import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ReactNode } from "react";
import styled from "styled-components";
import { depths, s, borderRadius } from "../../styles";
import type { EditorNotice } from "../types";
import { ColorPreview } from "./ColorPreview";

interface Props {
  /** The CSS color to preview, in its original notation. */
  color: string;
  /** Whether the card is currently shown. */
  open: boolean;
  /** Called when the card is dismissed by Radix, for example on Escape. */
  onOpenChange: (open: boolean) => void;
  /** Called when the pointer enters the card. */
  onMouseEnter: () => void;
  /** Called when the pointer leaves the card. */
  onMouseLeave: () => void;
  /** Callback used to surface a notice to the user. */
  onNotice?: EditorNotice;
  /** The swatch the card is anchored to. */
  children: ReactNode;
}

/**
 * The hover card shown alongside a color swatch. It lives in its own module so
 * that its browser-only dependency on Radix is loaded lazily and stays out of
 * the editor schema graph, which is also imported on the server.
 *
 * @returns the popover wrapping the provided swatch.
 */
export default function ColorHoverCard({
  color,
  open,
  onOpenChange,
  onMouseEnter,
  onMouseLeave,
  onNotice,
  children,
}: Props) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          asChild
          side="top"
          align="center"
          sideOffset={6}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <Card onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <ColorPreview color={color} onNotice={onNotice} />
          </Card>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

const Card = styled.div`
  /* Sized to the widest notation so that no value has to wrap. */
  width: max-content;
  min-width: 180px;
  padding: 8px;
  z-index: ${depths.modal};
  background: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  ${borderRadius(8)}
  outline: none;

  &[data-state="open"] {
    animation: fadeIn 150ms ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
