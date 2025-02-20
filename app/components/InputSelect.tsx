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
import Button, { Props as ButtonProps, Inner } from "~/components/Button";
import Text from "~/components/Text";
import useMenuHeight from "~/hooks/useMenuHeight";
import useMobile from "~/hooks/useMobile";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import { fadeAndScaleIn } from "~/styles/animations";
import {
  Position,
  Background as ContextMenuBackground,
  Backdrop,
  Placement,
} from "./ContextMenu";
import { MenuAnchorCSS } from "./ContextMenu/MenuItem";
import Separator from "./ContextMenu/Separator";
import { LabelText } from "./Input";

export type Option = {
  label: string | JSX.Element;
  value: string;
  description?: string;
  divider?: boolean;
};

export type Props = Omit<ButtonProps<any>, "onChange"> & {
  id?: string;
  name?: string;
  value?: string | null;
  label?: React.ReactNode;
  nude?: boolean;
  ariaLabel: string;
  short?: boolean;
  disabled?: boolean;
  className?: string;
  labelHidden?: boolean;
  icon?: React.ReactNode;
  options: Option[];
  /** @deprecated Removing soon, do not use. */
  note?: React.ReactNode;
  /** Callback function that is called when the value changes. Return false to cancel the change. */
  onChange?: (value: string | null) => void | Promise<boolean | void>;
  style?: React.CSSProperties;
  /**
   * Set to true if this component is rendered inside a Modal.
   * The Modal will take care of preventing body scroll behaviour.
   */
  skipBodyScroll?: boolean;
};

export interface InputSelectRef {
  value: string | null;
  focus: () => void;
  blur: () => void;
}

interface InnerProps extends React.HTMLAttributes<HTMLDivElement> {
  placement: Placement;
}

const getOptionFromValue = (options: Option[], value: string | null) =>
  options.find((option) => option.value === value);

const InputSelect = (props: Props, ref: React.RefObject<InputSelectRef>) => {
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
    nude,
    skipBodyScroll,
    ...rest
  } = props;

  const select = useSelectState({
    gutter: 0,
    modal: true,
    selectedValue: value,
  });

  const popover = useSelectPopover({
    ...select,
    hideOnClickOutside: false,
    preventBodyScroll: skipBodyScroll ? false : true,
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
    (opt) => opt.value === select.selectedValue
  );

  // Custom click outside handling rather than using `hideOnClickOutside` from reakit so that we can
  // prevent event bubbling.
  useOnClickOutside(
    contentRef,
    (event) => {
      if (buttonRef.current?.contains(event.target as Node)) {
        return;
      }
      if (select.visible) {
        event.stopPropagation();
        event.preventDefault();
        select.hide();
      }
    },
    { capture: true }
  );

  React.useImperativeHandle(ref, () => ({
    focus: () => {
      buttonRef.current?.focus();
    },
    blur: () => {
      buttonRef.current?.blur();
    },
    value: select.selectedValue,
  }));

  React.useEffect(() => {
    previousValue.current = value;

    // Update the selected value if it changes from the outside – both of these lines are needed
    // for correct functioning
    select.selectedValue = value;
    select.setSelectedValue(value);
  }, [value]);

  React.useEffect(() => {
    if (previousValue.current === select.selectedValue) {
      return;
    }
    const previous = previousValue.current;
    previousValue.current = select.selectedValue;

    const response = onChange?.(select.selectedValue);
    if (response && response instanceof Promise) {
      void response.then((success) => {
        if (success === false) {
          select.selectedValue = previous;
          select.setSelectedValue(previous);
        }
      });
    }
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

  function labelForOption(opt: Option) {
    return (
      <>
        {opt.label}
        {opt.description && (
          <>
            &nbsp;
            <Text as="span" type="tertiary" size="small" ellipsis>
              – {opt.description}
            </Text>
          </>
        )}
      </>
    );
  }

  const option = getOptionFromValue(options, select.selectedValue);

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
          {(buttonProps) => (
            <StyledButton
              neutral
              disclosure
              className={className}
              icon={icon}
              $nude={nude}
              {...buttonProps}
            >
              {option ? (
                labelForOption(option)
              ) : (
                <Placeholder>Select a {ariaLabel.toLowerCase()}</Placeholder>
              )}
            </StyledButton>
          )}
        </Select>
        <SelectPopover
          {...select}
          {...popover}
          aria-label={ariaLabel}
          preventBodyScroll={skipBodyScroll ? false : true}
        >
          {(popoverProps: InnerProps) => {
            const topAnchor = popoverProps.style?.top === "0";
            const rightAnchor = popoverProps.placement === "bottom-end";

            return (
              <Positioner {...popoverProps}>
                <Background
                  dir="auto"
                  ref={contentRef}
                  topAnchor={topAnchor}
                  rightAnchor={rightAnchor}
                  hiddenScrollbars
                  maxWidth={400}
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
                    ? options.map((opt) => {
                        const isSelected = select.selectedValue === opt.value;
                        const Icon = isSelected ? CheckmarkIcon : Spacer;
                        return (
                          <React.Fragment key={opt.value}>
                            {opt.divider && <Separator />}
                            <StyledSelectOption
                              {...select}
                              value={opt.value}
                              key={opt.value}
                              ref={isSelected ? selectedRef : undefined}
                            >
                              <Icon />
                              &nbsp;
                              {labelForOption(opt)}
                            </StyledSelectOption>
                          </React.Fragment>
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
        <Text as="p" type="secondary" size="small">
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

const StyledButton = styled(Button)<{ $nude?: boolean }>`
  font-weight: normal;
  text-transform: none;
  margin-bottom: 16px;
  display: block;
  width: 100%;
  cursor: var(--pointer);

  &:hover:not(:disabled) {
    background: ${s("buttonNeutralBackground")};
  }

  ${(props) =>
    props.$nude &&
    css`
      border-color: transparent;
      box-shadow: none;
    `}

  ${Inner} {
    line-height: 28px;
    padding-left: 12px;
    padding-right: 4px;
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

export const Positioner = styled(Position)`
  pointer-events: all;

  &:focus-visible {
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

export default React.forwardRef(InputSelect);
