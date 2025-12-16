import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import * as React from "react";
import styled from "styled-components";
import { Drawer as DrawerPrimitive } from "vaul";
import { depths, s } from "@shared/styles";
import Flex from "../Flex";
import Text from "../Text";
import { Overlay } from "./components/Overlay";
import { m } from "framer-motion";
import useMeasure from "react-use-measure";

/** Root Drawer component - all the other components are rendered inside it. */
const Drawer = (props: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root {...props} />
);
Drawer.displayName = "Drawer";

/** Drawer's trigger. */
const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerHandle = DrawerPrimitive.Handle;

/** Drawer's content - renders the overlay and the actual content. */
const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>((props, ref) => {
  const { children, ...rest } = props;
  const [measureRef, bounds] = useMeasure();

  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay asChild>
        <Overlay />
      </DrawerPrimitive.Overlay>
      <DrawerPrimitive.Content ref={ref} asChild>
        <StyledContent
          animate={{
            height: bounds.height,
            transition: { bounce: 0, duration: 0.2 },
          }}
        >
          <StyledInnerContent ref={measureRef} {...rest}>
            {children}
          </StyledInnerContent>
        </StyledContent>
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  );
});
DrawerContent.displayName = DrawerPrimitive.Content.displayName;

/** Drawer's title shown in the center. */
const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>((props, ref) => {
  const { hidden, children, ...rest } = props;

  const title = (
    <Text size="medium" weight="bold" as={TitleWrapper} justify="center">
      {children}
    </Text>
  );

  return (
    <DrawerPrimitive.Title ref={ref} {...rest} asChild>
      {hidden ? (
        <VisuallyHidden.Root>{title}</VisuallyHidden.Root>
      ) : (
        <>{title}</>
      )}
    </DrawerPrimitive.Title>
  );
});
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

/** Styled components. */
const StyledContent = styled(m.div)`
  z-index: ${depths.menu};
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  min-width: 180px;
  max-width: 100%;
  min-height: 44px;
  max-height: 90vh;

  border-radius: 6px;

  background: ${s("menuBackground")};
`;

const StyledInnerContent = styled.div`
  padding: 6px;
  height: 100%;
`;

const TitleWrapper = styled(Flex)`
  padding: 8px 0;
`;

export { Drawer, DrawerTrigger, DrawerHandle, DrawerContent, DrawerTitle };
