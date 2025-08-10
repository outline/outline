import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { LocationDescriptor } from "history";
import * as React from "react";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import Scrollable from "~/components/Scrollable";
import { fadeAndScaleIn } from "~/styles/animations";
import {
  MenuButton,
  MenuDisclosure,
  MenuExternalLink,
  MenuHeader,
  MenuInternalLink,
  MenuLabel,
  MenuSeparator,
  MenuSubTrigger,
  SelectedIconWrapper,
} from "./components/Menu";
import { CheckmarkIcon } from "outline-icons";
import Tooltip from "../Tooltip";

const ContextMenu = ContextMenuPrimitive.Root;

const ContextSubMenu = ContextMenuPrimitive.Sub;

const ContextMenuTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Trigger>
>((props, ref) => {
  const { children, ...rest } = props;
  return (
    <ContextMenuPrimitive.Trigger ref={ref} {...rest} asChild>
      {children}
    </ContextMenuPrimitive.Trigger>
  );
});
ContextMenuTrigger.displayName = ContextMenuPrimitive.Trigger.displayName;

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>((props, ref) => {
  const { children, ...rest } = props;

  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        ref={ref}
        {...rest}
        alignOffset={4}
        collisionPadding={6}
        asChild
      >
        <StyledScrollable hiddenScrollbars>{children}</StyledScrollable>
      </ContextMenuPrimitive.Content>
    </ContextMenuPrimitive.Portal>
  );
});
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

type ContextSubMenuTriggerProps = BaseContextMenuItemProps &
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger>;

const ContextSubMenuTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  ContextSubMenuTriggerProps
>((props, ref) => {
  const { label, icon, disabled, ...rest } = props;

  return (
    <ContextMenuPrimitive.SubTrigger ref={ref} {...rest} asChild>
      <MenuSubTrigger disabled={disabled}>
        {icon}
        <MenuLabel>{label}</MenuLabel>
        <MenuDisclosure />
      </MenuSubTrigger>
    </ContextMenuPrimitive.SubTrigger>
  );
});
ContextSubMenuTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;

const ContextSubMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>((props, ref) => {
  const { children, ...rest } = props;

  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent
        ref={ref}
        {...rest}
        collisionPadding={6}
        asChild
      >
        <StyledScrollable hiddenScrollbars>{children}</StyledScrollable>
      </ContextMenuPrimitive.SubContent>
    </ContextMenuPrimitive.Portal>
  );
});
ContextSubMenuContent.displayName = ContextMenuPrimitive.SubContent.displayName;

type ContextMenuGroupProps = {
  label: string;
  items: React.ReactNode[];
} & Omit<
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Group>,
  "children" | "asChild"
>;

const ContextMenuGroup = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Group>,
  ContextMenuGroupProps
>((props, ref) => {
  const { label, items, ...rest } = props;

  return (
    <ContextMenuPrimitive.Group ref={ref} {...rest}>
      <ContextMenuLabel>{label}</ContextMenuLabel>
      {items}
    </ContextMenuPrimitive.Group>
  );
});
ContextMenuGroup.displayName = ContextMenuPrimitive.Group.displayName;

type BaseContextMenuItemProps = {
  label: string;
  icon?: React.ReactElement;
  disabled?: boolean;
};

type ContextMenuButtonProps = BaseContextMenuItemProps & {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  tooltip?: React.ReactChild;
  selected?: boolean;
  dangerous?: boolean;
} & Omit<
    React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item>,
    "children" | "asChild" | "onClick"
  >;

const ContextMenuButton = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  ContextMenuButtonProps
>((props, ref) => {
  const {
    label,
    icon,
    tooltip,
    disabled,
    selected,
    dangerous,
    onClick,
    ...rest
  } = props;

  const button = (
    <ContextMenuPrimitive.Item ref={ref} disabled={disabled} {...rest} asChild>
      <MenuButton disabled={disabled} $dangerous={dangerous} onClick={onClick}>
        {icon}
        <MenuLabel>{label}</MenuLabel>
        {selected !== undefined && (
          <SelectedIconWrapper aria-hidden>
            {selected ? <CheckmarkIcon /> : null}
          </SelectedIconWrapper>
        )}
      </MenuButton>
    </ContextMenuPrimitive.Item>
  );

  return tooltip ? (
    <Tooltip content={tooltip} placement="bottom">
      <div>{button}</div>
    </Tooltip>
  ) : (
    <>{button}</>
  );
});
ContextMenuButton.displayName = "ContextMenuButton";

type ContextMenuInternalLinkProps = BaseContextMenuItemProps & {
  to: LocationDescriptor;
} & Omit<
    React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item>,
    "children" | "asChild" | "onClick"
  >;

const ContextMenuInternalLink = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  ContextMenuInternalLinkProps
>((props, ref) => {
  const { label, icon, disabled, to, ...rest } = props;

  return (
    <ContextMenuPrimitive.Item ref={ref} disabled={disabled} {...rest} asChild>
      <MenuInternalLink to={to} disabled={disabled}>
        {icon}
        <MenuLabel>{label}</MenuLabel>
      </MenuInternalLink>
    </ContextMenuPrimitive.Item>
  );
});
ContextMenuInternalLink.displayName = "ContextMenuInternalLink";

type ContextMenuExternalLinkProps = BaseContextMenuItemProps & {
  href: string;
  target?: string;
} & Omit<
    React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item>,
    "children" | "asChild" | "onClick"
  >;

const ContextMenuExternalLink = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  ContextMenuExternalLinkProps
>((props, ref) => {
  const { label, icon, disabled, href, target, ...rest } = props;

  return (
    <ContextMenuPrimitive.Item ref={ref} disabled={disabled} {...rest} asChild>
      <MenuExternalLink href={href} target={target} disabled={disabled}>
        {icon}
        <MenuLabel>{label}</MenuLabel>
      </MenuExternalLink>
    </ContextMenuPrimitive.Item>
  );
});
ContextMenuExternalLink.displayName = "ContextMenuExternalLink";

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>((props, ref) => (
  <ContextMenuPrimitive.Separator ref={ref} {...props} asChild>
    <MenuSeparator />
  </ContextMenuPrimitive.Separator>
));
ContextMenuSeparator.displayName = "ContextMenuSeparator";

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.Label ref={ref} {...props} asChild>
    <MenuHeader>{children}</MenuHeader>
  </ContextMenuPrimitive.Label>
));
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;

/** Styled components */
const StyledScrollable = styled(Scrollable)`
  z-index: ${depths.menu};
  min-width: 180px;
  max-width: 276px;
  min-height: 44px;
  max-height: min(85vh, var(--radix-context-menu-content-available-height));
  font-weight: normal;

  background: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  border-radius: 6px;
  padding: 6px;
  outline: none;

  transform-origin: var(--radix-context-menu-content-transform-origin);

  &[data-state="open"] {
    animation: ${fadeAndScaleIn} 150ms ease-out;
  }

  @media print {
    display: none;
  }
`;

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuButton,
  ContextMenuInternalLink,
  ContextMenuExternalLink,
  ContextMenuSeparator,
  ContextMenuGroup,
  ContextMenuLabel,
  ContextSubMenu,
  ContextSubMenuTrigger,
  ContextSubMenuContent,
};
