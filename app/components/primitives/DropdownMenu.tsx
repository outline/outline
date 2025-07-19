import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { LocationDescriptor } from "history";
import * as React from "react";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import Scrollable from "~/components/Scrollable";
import { fadeAndScaleIn } from "~/styles/animations";
import {
  MenuButton,
  MenuExternalLink,
  MenuHeader,
  MenuInternalLink,
  MenuLabel,
  MenuSeparator,
} from "./components/Menu";

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>((props, ref) => {
  const { children, ...rest } = props;
  return (
    <DropdownMenuPrimitive.Trigger ref={ref} {...rest} asChild>
      {children}
    </DropdownMenuPrimitive.Trigger>
  );
});
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>((props, ref) => {
  const { children, ...rest } = props;

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content ref={ref} {...rest} asChild>
        <StyledScrollable hiddenScrollbars>{children}</StyledScrollable>
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
});
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

type DropdownMenuGroupProps = {
  label: string;
  items: React.ReactNode[];
} & Omit<
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Group>,
  "children" | "asChild"
>;

const DropdownMenuGroup = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Group>,
  DropdownMenuGroupProps
>((props, ref) => {
  const { label, items, ...rest } = props;

  return (
    <DropdownMenuPrimitive.Group ref={ref} {...rest}>
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      {items}
    </DropdownMenuPrimitive.Group>
  );
});
DropdownMenuGroup.displayName = DropdownMenuPrimitive.Group.displayName;

type BaseDropdownItemProps = {
  label: string;
  icon?: React.ReactElement;
  disabled?: boolean;
};

type DropdownMenuButtonProps = BaseDropdownItemProps & {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  dangerous?: boolean;
} & Omit<
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>,
    "children" | "asChild" | "onClick"
  >;

const DropdownMenuButton = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuButtonProps
>((props, ref) => {
  const { label, icon, disabled, dangerous, onClick, ...rest } = props;

  return (
    <DropdownMenuPrimitive.Item ref={ref} {...rest} asChild>
      <MenuButton disabled={disabled} $dangerous={dangerous} onClick={onClick}>
        {icon}
        <MenuLabel>{label}</MenuLabel>
      </MenuButton>
    </DropdownMenuPrimitive.Item>
  );
});
DropdownMenuButton.displayName = "DropdownMenuButton";

type DropdownMenuInternalLinkProps = BaseDropdownItemProps & {
  to: LocationDescriptor;
} & Omit<
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>,
    "children" | "asChild" | "onClick"
  >;

const DropdownMenuInternalLink = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuInternalLinkProps
>((props, ref) => {
  const { label, icon, disabled, to, ...rest } = props;

  return (
    <DropdownMenuPrimitive.Item ref={ref} {...rest} asChild>
      <MenuInternalLink to={to} disabled={disabled}>
        {icon}
        <MenuLabel>{label}</MenuLabel>
      </MenuInternalLink>
    </DropdownMenuPrimitive.Item>
  );
});
DropdownMenuInternalLink.displayName = "DropdownMenuInternalLink";

type DropdownMenuExternalLinkProps = BaseDropdownItemProps & {
  href: string;
  target?: string;
} & Omit<
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>,
    "children" | "asChild" | "onClick"
  >;

const DropdownMenuExternalLink = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuExternalLinkProps
>((props, ref) => {
  const { label, icon, disabled, href, target, ...rest } = props;

  return (
    <DropdownMenuPrimitive.Item ref={ref} {...rest} asChild>
      <MenuExternalLink href={href} target={target} disabled={disabled}>
        {icon}
        <MenuLabel>{label}</MenuLabel>
      </MenuExternalLink>
    </DropdownMenuPrimitive.Item>
  );
});
DropdownMenuExternalLink.displayName = "DropdownMenuExternalLink";

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>((props, ref) => (
  <DropdownMenuPrimitive.Separator ref={ref} {...props} asChild>
    <MenuSeparator />
  </DropdownMenuPrimitive.Separator>
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.Label ref={ref} {...props} asChild>
    <MenuHeader>{children}</MenuHeader>
  </DropdownMenuPrimitive.Label>
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

/** Styled components */
const StyledScrollable = styled(Scrollable)`
  z-index: ${depths.menu};
  min-width: 180px;
  max-width: 276px;
  min-height: 44px;
  max-height: 75vh;
  font-weight: normal;

  background: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  border-radius: 6px;
  padding: 6px;
  outline: none;

  transform-origin: var(--radix-dropdown-menu-content-transform-origin);

  &[data-state="open"] {
    animation: ${fadeAndScaleIn} 150ms ease-out;
  }

  @media print {
    display: none;
  }
`;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuButton,
  DropdownMenuInternalLink,
  DropdownMenuExternalLink,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuLabel,
};
