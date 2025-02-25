import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import React from "react";
import styled from "styled-components";
import { Drawer as DrawerPrimitive } from "vaul";
import { depths, s } from "@shared/styles";
import { Overlay } from "./components/Overlay";

/* ----------------------------------------------------------------------------
 * Root
 * --------------------------------------------------------------------------*/

const Drawer = (props: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground {...props} />
);
Drawer.displayName = "Drawer";

/* ----------------------------------------------------------------------------
 * Trigger
 * --------------------------------------------------------------------------*/

const DrawerTrigger = DrawerPrimitive.Trigger;

/* ----------------------------------------------------------------------------
 * Content
 * --------------------------------------------------------------------------*/

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>((props, ref) => {
  const { children, ...rest } = props;

  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay asChild>
        <Overlay />
      </DrawerPrimitive.Overlay>
      <StyledContent ref={ref} {...rest}>
        {children}
      </StyledContent>
    </DrawerPrimitive.Portal>
  );
});
DrawerContent.displayName = DrawerPrimitive.Content.displayName;

/* ----------------------------------------------------------------------------
 * Title
 * --------------------------------------------------------------------------*/

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>((props, ref) => {
  const { hidden, children, ...rest } = props;

  return (
    <DrawerPrimitive.Title ref={ref} {...rest} asChild>
      {hidden ? (
        <VisuallyHidden.Root>
          {<StyledTitle>{children}</StyledTitle>}
        </VisuallyHidden.Root>
      ) : (
        <StyledTitle>{children}</StyledTitle>
      )}
    </DrawerPrimitive.Title>
  );
});
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

/* ----------------------------------------------------------------------------
 * Styled components
 * --------------------------------------------------------------------------*/

const StyledContent = styled(DrawerPrimitive.Content)`
  z-index: ${depths.menu};
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  min-width: 180px;
  max-width: 100%;
  min-height: 44px;
  max-height: 90vh;

  padding: 6px;
  border-radius: 6px;

  background: ${s("menuBackground")};
`;

const StyledTitle = styled.div`
  font-size: 16px;
  font-weight: 500;
  padding: 8px;
  padding-left: 12px;
`;

export { Drawer, DrawerTrigger, DrawerContent, DrawerTitle };
