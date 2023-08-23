import {
  Select,
  SelectOption,
  useSelectState,
  useSelectPopover,
  SelectPopover,
} from "@renderlesskit/react";
import { CheckmarkIcon } from "outline-icons";
import * as React from "react";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import Button, { Inner } from "~/components/Button";
import Text from "~/components/Text";
import useMenuHeight from "~/hooks/useMenuHeight";
import useMobile from "~/hooks/useMobile";
import { fadeAndScaleIn } from "~/styles/animations";
import {
  Position,
  Background as ContextMenuBackground,
  Backdrop,
  Placement,
} from "./ContextMenu";
import { MenuAnchorCSS } from "./ContextMenu/MenuItem";
import { LabelText } from "./Input";

export type Option = {
  label: string | JSX.Element;
  value: string;
};

export type Props = {
  id?: string;
  name?: string;
  value?: string | null;
  label?: string;
  nude?: boolean;
  ariaLabel: string;
  short?: boolean;
  disabled?: boolean;
  className?: string;
  labelHidden?: boolean;
  icon?: React.ReactNode;
  options: Option[];
  note?: React.ReactNode;
  onChange?: (value: string | null) => void;
};

const getOptionFromValue = (options: Option[], value: string | null) =>
  options.find((option) => option.value === value);

const InputSelect = (props: Props) => {
  const {
    value = null,
    label,
    className,
    labelHidden,
    options,
    short,
    ariaLabel,
    onChange,
    disabled,
    note,
    icon,
    ...rest
  } = props;

  const select = useSelectState({
    gutter: 0,
    modal: true,
    selectedValue: value,
  });

  const popOver = useSelectPopover({
    ...select,
    hideOnClickOutside: true,
    preventBodyScroll: true,
    disabled,
  });

  const isMobile = useMobile();
  const previousValue = React.useRef<string | null>(value);
  const selectedRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const minWidth = buttonRef.current?.offsetWidth || 0;
  const margin = 8;
  const menuMaxHeight = useMenuHeight({
    visible: select.visible,
    elementRef: select.unstable_disclosureRef,
    margin,
  });
  const maxHeight = Math.min(
    menuMaxHeight ?? 0,
    window.innerHeight -
      (buttonRef.current?.getBoundingClientRect().bottom ?? 0) -
      margin
  );

  const wrappedLabel = <LabelText>{label}</LabelText>;
  const selectedValueIndex = options.findIndex(
    (option) => option.value === select.selectedValue
  );

  React.useEffect(() => {
    if (previousValue.current === select.selectedValue) {
      return;
    }
    previousValue.current = select.selectedValue;

    onChange?.(select.selectedValue);
  }, [onChange, select.selectedValue]);

  React.useLayoutEffect(() => {
    if (select.visible) {
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = selectedValueIndex * 32;
        }
      });
    }
  }, [select.visible, selectedValueIndex]);

  return (
    <>
      <Wrapper short={short}>
        {label &&
          (labelHidden ? (
            <VisuallyHidden>{wrappedLabel}</VisuallyHidden>
          ) : (
            wrappedLabel
          ))}

        <Select {...select} disabled={disabled} {...rest} ref={buttonRef}>
          {(props) => (
            <StyledButton
              neutral
              disclosure
              className={className}
              icon={icon}
              {...props}
            >
              {getOptionFromValue(options, select.selectedValue)?.label || (
                <Placeholder>Select a {ariaLabel.toLowerCase()}</Placeholder>
              )}
            </StyledButton>
          )}
        </Select>
        <SelectPopover {...select} {...popOver} aria-label={ariaLabel}>
          {(
            props: React.HTMLAttributes<HTMLDivElement> & {
              placement: Placement;
            }
          ) => {
            const topAnchor = props.style?.top === "0";
            const rightAnchor = props.placement === "bottom-end";

            return (
              <Positioner {...props}>
                <Background
                  dir="auto"
                  ref={contentRef}
                  topAnchor={topAnchor}
                  rightAnchor={rightAnchor}
                  hiddenScrollbars
                  style={
                    maxHeight && topAnchor
                      ? {
                          maxHeight,
                          minWidth,
                        }
                      : {
                          minWidth,
                        }
                  }
                >
                  {select.visible
                    ? options.map((option) => {
                        const isSelected =
                          select.selectedValue === option.value;
                        const Icon = isSelected ? CheckmarkIcon : Spacer;
                        return (
                          <StyledSelectOption
                            {...select}
                            value={option.value}
                            key={option.value}
                            ref={isSelected ? selectedRef : undefined}
                          >
                            <Icon />
                            &nbsp;
                            {option.label}
                          </StyledSelectOption>
                        );
                      })
                    : null}
                </Background>
              </Positioner>
            );
          }}
        </SelectPopover>
      </Wrapper>
      {note && (
        <Text type="secondary" size="small">
          {note}
        </Text>
      )}
      {select.visible && isMobile && <Backdrop />}
    </>
  );
};

const Background = styled(ContextMenuBackground)`
  animation: ${fadeAndScaleIn} 200ms ease;
`;

const Placeholder = styled.span`
  color: ${s("placeholder")};
`;

const Spacer = styled.div`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

const StyledButton = styled(Button)<{ nude?: boolean }>`
  font-weight: normal;
  text-transform: none;
  margin-bottom: 16px;
  display: block;
  width: 100%;
  cursor: default;

  &:hover:not(:disabled) {
    background: ${s("buttonNeutralBackground")};
  }

  ${(props) =>
    props.nude &&
    css`
      border-color: transparent;
      box-shadow: none;
    `}

  ${Inner} {
    line-height: 28px;
    padding-left: 16px;
    padding-right: 8px;
  }

  svg {
    justify-self: flex-end;
    margin-left: auto;
  }
`;

export const StyledSelectOption = styled(SelectOption)`
  ${MenuAnchorCSS}
  /* overriding the styles from MenuAnchorCSS because we use &nbsp; here */
  svg:not(:last-child) {
    margin-right: 0px;
  }
`;

const Wrapper = styled.label<{ short?: boolean }>`
  display: block;
  max-width: ${(props) => (props.short ? "350px" : "100%")};
`;

const Positioner = styled(Position)`
  &.focus-visible {
    ${StyledSelectOption} {
      &[aria-selected="true"] {
        color: ${(props) => props.theme.white};
        background: ${s("accent")};
        box-shadow: none;
        cursor: var(--pointer);

        svg {
          fill: ${(props) => props.theme.white};
        }
      }
    }
  }
`;

export default InputSelect;
