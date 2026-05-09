import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CheckmarkIcon, ExpandedIcon } from "outline-icons";
import { darken, transparentize } from "polished";
import * as React from "react";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import { fadeAndScaleIn } from "~/styles/animations";
import { undraggableOnDesktop } from "~/styles";

interface Option {
  /** Display label for the option. */
  label: string;
  /** Value for the option. */
  value: string;
  /** Optional description shown below the label. */
  description?: string;
}

interface SplitButtonProps {
  /** The options available in the dropdown. */
  options: Option[];
  /** The currently selected option value. */
  selectedValue: string;
  /** Called when a dropdown option is selected. */
  onSelect: (value: string) => void;
  /** Called when the main button area is clicked. */
  onClick: (event: React.MouseEvent) => void;
  /** Whether the button is disabled. */
  disabled?: boolean;
  /** Use the neutral color variant instead of accent. */
  neutral?: boolean;
  children: React.ReactNode;
}

/**
 * A split button with a main action and a dropdown disclosure for selecting
 * from a set of options. Built on Radix UI DropdownMenu.
 */
export function SplitButton({
  options,
  selectedValue,
  onSelect,
  onClick,
  disabled,
  neutral,
  children,
}: SplitButtonProps) {
  const selectedOption = options.find((o) => o.value === selectedValue);
  const containerRef = React.useRef<HTMLSpanElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [alignOffset, setAlignOffset] = React.useState(0);

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (!open || !containerRef.current || !triggerRef.current) {
      return;
    }
    const containerLeft = containerRef.current.getBoundingClientRect().left;
    const triggerLeft = triggerRef.current.getBoundingClientRect().left;
    setAlignOffset(containerLeft - triggerLeft);
  }, []);

  return (
    <DropdownMenuPrimitive.Root onOpenChange={handleOpenChange}>
      <Container $neutral={neutral} $disabled={disabled} ref={containerRef}>
        <MainButton
          type="button"
          onClick={onClick}
          disabled={disabled}
          $neutral={neutral}
        >
          {children}
        </MainButton>
        <Divider $neutral={neutral} />
        <DropdownMenuPrimitive.Trigger asChild disabled={disabled}>
          <DisclosureButton
            ref={triggerRef}
            type="button"
            disabled={disabled}
            $neutral={neutral}
            aria-label={`Selected: ${selectedOption?.label ?? selectedValue}`}
          >
            <StyledExpandedIcon />
          </DisclosureButton>
        </DropdownMenuPrimitive.Trigger>
      </Container>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          alignOffset={alignOffset}
          sideOffset={4}
          collisionPadding={6}
          asChild
        >
          <MenuContent onClick={(e) => e.stopPropagation()}>
            {options.map((option) => (
              <DropdownMenuPrimitive.Item
                key={option.value}
                asChild
                onSelect={() => onSelect(option.value)}
              >
                <MenuItem>
                  <MenuItemContent>
                    <MenuItemLabel>{option.label}</MenuItemLabel>
                    {option.description && (
                      <MenuItemDescription>
                        {option.description}
                      </MenuItemDescription>
                    )}
                  </MenuItemContent>
                  <CheckmarkWrapper>
                    {option.value === selectedValue && (
                      <CheckmarkIcon size={18} />
                    )}
                  </CheckmarkWrapper>
                </MenuItem>
              </DropdownMenuPrimitive.Item>
            ))}
          </MenuContent>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

const accentStyles = css`
  background: ${s("accent")};
  color: ${s("accentText")};
  box-shadow: rgba(0, 0, 0, 0.2) 0px 1px 2px;
`;

const neutralStyles = css`
  background: inherit;
  color: ${(props) => props.theme.buttonNeutralText};
  box-shadow:
    rgba(0, 0, 0, 0.07) 0px 1px 2px,
    ${(props) => props.theme.buttonNeutralBorder} 0 0 0 1px inset;
`;

const Container = styled.span<{ $neutral?: boolean; $disabled?: boolean }>`
  display: inline-flex;
  align-items: stretch;
  border-radius: 6px;
  height: 32px;
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
  ${undraggableOnDesktop()}
  ${(props) => (props.$neutral ? neutralStyles : accentStyles)}

  ${(props) =>
    props.$disabled &&
    `
    cursor: default;
    pointer-events: none;
    opacity: 0.7;
  `}
`;

const buttonReset = css`
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: var(--pointer);
  appearance: none;

  &:disabled {
    cursor: default;
    pointer-events: none;
  }
`;

const MainButton = styled.button<{ $neutral?: boolean }>`
  ${buttonReset}
  display: flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 6px 0 0 6px;
  white-space: nowrap;
  transition: background 200ms ease-out;

  &:hover:not(:disabled) {
    background: ${(props) =>
      props.$neutral
        ? darken(0.05, props.theme.buttonNeutralBackground)
        : "rgba(0, 0, 0, 0.1)"};
    transition: background 0s;
  }
`;

const DisclosureButton = styled.button<{ $neutral?: boolean }>`
  ${buttonReset}
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border-radius: 0 6px 6px 0;
  transition: background 200ms ease-out;

  &:hover:not(:disabled),
  &[data-state="open"] {
    background: ${(props) =>
      props.$neutral
        ? darken(0.05, props.theme.buttonNeutralBackground)
        : "rgba(0, 0, 0, 0.1)"};
    transition: background 0s;
  }
`;

const Divider = styled.span<{ $neutral?: boolean }>`
  width: 1px;
  align-self: stretch;
  margin: 6px 0;
  background: ${(props) =>
    props.$neutral
      ? transparentize(0.7, props.theme.buttonNeutralText)
      : "rgba(255, 255, 255, 0.3)"};
`;

const StyledExpandedIcon = styled(ExpandedIcon)`
  opacity: 0.8;
`;

const MenuContent = styled.div`
  z-index: 4000;
  min-width: 180px;
  max-width: 276px;
  background: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  border-radius: 6px;
  padding: 6px;
  outline: none;

  transform-origin: var(--radix-dropdown-menu-content-transform-origin);
  &[data-state="open"] {
    animation: ${fadeAndScaleIn} 150ms ease-out;
  }
`;

const MenuItem = styled.button`
  ${buttonReset}
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 32px;
  font-size: 14px;
  color: ${s("textSecondary")};
  border-radius: 4px;
  padding: 4px 12px;
  gap: 8px;
  user-select: none;

  &[data-highlighted] {
    color: ${s("accentText")};
    background: ${s("accent")};
    outline: none;
  }
`;

const MenuItemContent = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  text-align: left;
`;

const MenuItemLabel = styled.span`
  font-weight: 500;
`;

const MenuItemDescription = styled.span`
  font-size: 12px;
  opacity: 0.75;
  margin-top: 1px;
`;

const CheckmarkWrapper = styled.span`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;
